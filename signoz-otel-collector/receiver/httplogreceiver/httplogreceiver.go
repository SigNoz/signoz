package httplogreceiver

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/SigNoz/signoz-otel-collector/receiver/httplogreceiver/bodyparser"
	"github.com/SigNoz/signoz-otel-collector/receiver/httplogreceiver/internal/metadata"
	"github.com/gorilla/mux"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/config/confighttp"
	"go.opentelemetry.io/collector/consumer"
	"go.opentelemetry.io/collector/receiver"
	"go.opentelemetry.io/collector/receiver/receiverhelper"
)

const (
	// Default endpoints to bind to.
	defaultEndpoint = ":54321"

	defaultServerTimeout = 20 * time.Second
)

// NewFactory creates a factory for httplogreceiver
func NewFactory() receiver.Factory {
	return receiver.NewFactory(metadata.Type, createDefaultConfig, receiver.WithLogs(createLogsReceiver, metadata.LogsStability))
}

// CreateDefaultConfig creates a config with type and version
func createDefaultConfig() component.Config {
	return &Config{
		HTTPServerSettings: confighttp.HTTPServerSettings{
			Endpoint: defaultEndpoint,
		},
		Source: "",
	}
}

// createLogsReceiver creates a logs receiver based on provided config.
func createLogsReceiver(
	_ context.Context,
	params receiver.CreateSettings,
	cfg component.Config,
	consumer consumer.Logs,
) (receiver.Logs, error) {
	rCfg := cfg.(*Config)

	receiverLock.Lock()
	r := receivers[rCfg]
	if r == nil {
		var err error
		r, err = newReceiver(params, *rCfg)
		if err != nil {
			return nil, err
		}
		receivers[rCfg] = r
	}
	receiverLock.Unlock()

	r.RegisterLogsConsumer(consumer)

	return r, nil
}

var receiverLock sync.Mutex

var receivers = map[*Config]*httplogreceiver{}

type httplogreceiver struct {
	settings     receiver.CreateSettings
	config       *Config
	logsConsumer consumer.Logs
	server       *http.Server
	shutdownWG   sync.WaitGroup
	obsrecv      *receiverhelper.ObsReport
	parser       bodyparser.Parser
}

// New creates the httplogreceiver receiver with the given configuration.
func newReceiver(
	settings receiver.CreateSettings,
	config Config,
) (*httplogreceiver, error) {
	transport := "http"
	if config.TLSSetting != nil {
		transport = "https"
	}
	obsrecv, err := receiverhelper.NewObsReport(receiverhelper.ObsReportSettings{
		ReceiverID:             settings.ID,
		Transport:              transport,
		ReceiverCreateSettings: settings,
	})
	if err != nil {
		return nil, err
	}

	r := &httplogreceiver{
		settings: settings,
		config:   &config,
		obsrecv:  obsrecv,
		parser:   bodyparser.GetBodyParser(config.Source),
	}

	return r, nil
}

func (r *httplogreceiver) RegisterLogsConsumer(lc consumer.Logs) {
	r.logsConsumer = lc
}

// Start tells the receiver to start its processing.
// By convention the consumer of the received data is set when the receiver
// instance is created.
func (r *httplogreceiver) Start(_ context.Context, host component.Host) error {
	if r.logsConsumer == nil {
		return component.ErrNilNextConsumer
	}

	if r.server != nil {
		return nil
	}

	// set up the listener
	ln, err := r.config.HTTPServerSettings.ToListener()
	if err != nil {
		return fmt.Errorf("failed to bind to address %s: %w", r.config.Endpoint, err)
	}

	mx := mux.NewRouter()
	mx.HandleFunc("/", r.handleLogs)

	r.server, err = r.config.HTTPServerSettings.ToServer(host, r.settings.TelemetrySettings, mx)
	if err != nil {
		return err
	}

	// TODO: Evaluate what properties should be configurable, for now
	//		set some hard-coded values.
	r.server.ReadHeaderTimeout = defaultServerTimeout
	r.server.WriteTimeout = defaultServerTimeout

	r.shutdownWG.Add(1)
	go func() {
		defer r.shutdownWG.Done()
		if errHTTP := r.server.Serve(ln); !errors.Is(errHTTP, http.ErrServerClosed) && errHTTP != nil {
			host.ReportFatalError(errHTTP)
		}
	}()
	return nil
}

// Shutdown tells the receiver that should stop reception,
// giving it a chance to perform any necessary clean-up.
func (r *httplogreceiver) Shutdown(context.Context) error {
	if r.server == nil {
		return nil
	}
	err := r.server.Close()
	r.shutdownWG.Wait()
	return err
}

func (r *httplogreceiver) handleLogs(w http.ResponseWriter, req *http.Request) {
	ctx := r.obsrecv.StartMetricsOp(req.Context())

	// return this header if present. This is done to support vercel.
	if req.Header.Get("x-vercel-verify") != "" {
		w.Header().Add("x-vercel-verify", req.Header.Get("x-vercel-verify"))
	}

	if req.Method != "POST" {
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	logs, totalCount, err := r.parser.Parse(body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = r.logsConsumer.ConsumeLogs(ctx, logs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	r.obsrecv.EndMetricsOp(
		ctx,
		metadata.Type,
		totalCount,
		err)
}
