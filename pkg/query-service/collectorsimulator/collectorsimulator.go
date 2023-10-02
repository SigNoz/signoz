package collectorsimulator

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/knadh/koanf/parsers/yaml"
	"github.com/pkg/errors"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/confmap"
	"go.opentelemetry.io/collector/confmap/provider/yamlprovider"
	"go.opentelemetry.io/collector/connector"
	"go.opentelemetry.io/collector/exporter"
	"go.opentelemetry.io/collector/extension"
	"go.opentelemetry.io/collector/otelcol"
	"go.opentelemetry.io/collector/pdata/plog"
	"go.opentelemetry.io/collector/processor"
	"go.opentelemetry.io/collector/receiver"
	"go.opentelemetry.io/collector/service"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"go.signoz.io/signoz/pkg/query-service/collectorsimulator/inmemoryexporter"
	"go.signoz.io/signoz/pkg/query-service/collectorsimulator/inmemoryreceiver"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type SignozLog model.GetLogsResponse

type ProcessorConfig struct {
	Name   string
	Config map[string]interface{}
}

func SimulateLogsProcessing(
	ctx context.Context,
	processorFactories map[component.Type]processor.Factory,
	processorConfigs []ProcessorConfig,
	logs []plog.Logs,
	timeout time.Duration,
) (
	outputLogs []plog.Logs, collectorErrs []string, apiErr *model.ApiError,
) {
	// Construct and start a simulator (wraps a collector service)
	simulator, apiErr := NewLogsProcessingSimulator(
		ctx, processorFactories, processorConfigs,
	)
	if apiErr != nil {
		return nil, nil, model.WrapApiError(apiErr, "could not create logs processing simulator")
	}

	simulatorCleanup, apiErr := simulator.Start(ctx)
	// We can not rely on collector service to shutdown successfully and take care of
	// cleaning up inmemory component references and ensure there are no memory leaks
	defer simulatorCleanup()
	if apiErr != nil {
		return nil, nil, apiErr
	}

	// Do the simulation
	for _, plog := range logs {
		if apiErr = simulator.ConsumeLogs(ctx, plog); apiErr != nil {
			return nil, nil, model.WrapApiError(apiErr, "could not consume logs for simulation")
		}
	}

	result, apiErr := simulator.GetProcessedLogs(len(logs), timeout)
	if apiErr != nil {
		return nil, nil, model.InternalError(model.WrapApiError(apiErr,
			"could not get processed logs from simulator",
		))
	}

	// Shut down the simulator
	simulationErrs, apiErr := simulator.Shutdown(ctx)
	if apiErr != nil {
		return nil, simulationErrs, model.WrapApiError(apiErr,
			"could not shutdown logs processing simulator",
		)
	}

	return result, simulationErrs, nil
}

type LogsProcessingSimulator struct {
	// collector service to be used for the simulation
	collectorSvc *service.Service

	// Buffer where collectorSvc will log errors.
	collectorErrorLogsBuffer *bytes.Buffer

	// error channel where collector components will report fatal errors
	// Gets passed in as AsyncErrorChannel in service.Settings when creating
	// a collector service.
	collectorErrorChannel chan error

	// Unique ids of inmemory receiver and exporter instances that
	// will be created by collectorSvc
	inMemoryReceiverId string
	inMemoryExporterId string
}

func NewLogsProcessingSimulator(
	ctx context.Context,
	processorFactories map[component.Type]processor.Factory,
	processorConfigs []ProcessorConfig,
) (*LogsProcessingSimulator, *model.ApiError) {
	// Put together factories for collector components to be used in the simulation
	receiverFactories, err := receiver.MakeFactoryMap(inmemoryreceiver.NewFactory())
	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not create receiver factories."))
	}
	exporterFactories, err := exporter.MakeFactoryMap(inmemoryexporter.NewFactory())
	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not create processor factories."))
	}
	factories := otelcol.Factories{
		Receivers:  receiverFactories,
		Processors: processorFactories,
		Exporters:  exporterFactories,
	}

	// Prepare collector config yaml for simulation
	inMemoryReceiverId := uuid.NewString()
	inMemoryExporterId := uuid.NewString()

	collectorConfYaml, err := generateSimulationConfig(
		inMemoryReceiverId, processorConfigs, inMemoryExporterId,
	)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "could not generate collector config"))
	}

	// Parse and validate collector conf
	yamlP := yamlprovider.New()
	confProvider, err := otelcol.NewConfigProvider(otelcol.ConfigProviderSettings{
		ResolverSettings: confmap.ResolverSettings{
			URIs:      []string{"yaml:" + string(collectorConfYaml)},
			Providers: map[string]confmap.Provider{yamlP.Scheme(): yamlP},
		},
	})
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "could not create config provider."))
	}

	collectorCfg, err := confProvider.Get(ctx, factories)
	if err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "failed to parse collector config"))
	}
	if err = collectorCfg.Validate(); err != nil {
		return nil, model.BadRequest(errors.Wrap(err, "invalid collector config"))
	}

	// Build and start collector service.
	collectorErrChan := make(chan error)
	var collectorErrBuf bytes.Buffer

	svcSettings := service.Settings{
		Receivers:         receiver.NewBuilder(collectorCfg.Receivers, factories.Receivers),
		Processors:        processor.NewBuilder(collectorCfg.Processors, factories.Processors),
		Exporters:         exporter.NewBuilder(collectorCfg.Exporters, factories.Exporters),
		Connectors:        connector.NewBuilder(collectorCfg.Connectors, factories.Connectors),
		Extensions:        extension.NewBuilder(collectorCfg.Extensions, factories.Extensions),
		AsyncErrorChannel: collectorErrChan,
		LoggingOptions: []zap.Option{
			zap.ErrorOutput(zapcore.AddSync(&collectorErrBuf)),
		},
	}
	collectorSvc, err := service.New(ctx, svcSettings, collectorCfg.Service)
	if err != nil {
		return nil, model.InternalError(errors.Wrap(err, "could not instantiate collector service"))
	}

	return &LogsProcessingSimulator{
		inMemoryReceiverId:       inMemoryReceiverId,
		inMemoryExporterId:       inMemoryExporterId,
		collectorSvc:             collectorSvc,
		collectorErrorLogsBuffer: &collectorErrBuf,
		collectorErrorChannel:    collectorErrChan,
	}, nil
}

func (l *LogsProcessingSimulator) Start(ctx context.Context) (
	func(), *model.ApiError,
) {
	cleanupFn := func() {
		inmemoryreceiver.CleanupInstance(l.inMemoryReceiverId)
		inmemoryexporter.CleanupInstance(l.inMemoryExporterId)
	}

	err := l.collectorSvc.Start(ctx)
	if err != nil {
		return cleanupFn, model.InternalError(errors.Wrap(err, "could not start collector service for simulation"))
	}

	return cleanupFn, nil
}

func (l *LogsProcessingSimulator) ConsumeLogs(
	ctx context.Context, plog plog.Logs,
) *model.ApiError {
	receiver := inmemoryreceiver.GetReceiverInstance(l.inMemoryReceiverId)
	if receiver == nil {
		return model.InternalError(fmt.Errorf("could not find in memory receiver"))
	}
	if err := receiver.ConsumeLogs(ctx, plog); err != nil {
		return model.InternalError(errors.Wrap(err,
			"inmemory receiver could not consume logs for simulation",
		))
	}
	return nil
}

func (l *LogsProcessingSimulator) Shutdown(ctx context.Context) (
	simulationErrs []string, apiErr *model.ApiError,
) {
	simulationErrs = []string{}

	if err := l.collectorSvc.Shutdown(ctx); err != nil {
		return simulationErrs, model.InternalError(errors.Wrap(err, "could not shutdown the collector service"))
	}
	close(l.collectorErrorChannel)

	for err := range l.collectorErrorChannel {
		simulationErrs = append(simulationErrs, err.Error())
	}
	if l.collectorErrorLogsBuffer.Len() > 0 {
		errBufLines := strings.Split(strings.TrimSpace(
			l.collectorErrorLogsBuffer.String(),
		), "\n")
		simulationErrs = append(simulationErrs, errBufLines...)
	}
	return simulationErrs, nil
}

func (l *LogsProcessingSimulator) GetProcessedLogs(
	minLogCount int, timeout time.Duration,
) (
	[]plog.Logs, *model.ApiError,
) {
	exporter := inmemoryexporter.GetExporterInstance(l.inMemoryExporterId)
	if exporter == nil {
		return nil, model.InternalError(fmt.Errorf("could not find in memory exporter"))
	}

	// Must do a time based wait to ensure all logs come through.
	// For example, logstransformprocessor does internal batching and it
	// takes (processorCount * batchTime) for logs to get through.
	startTsMillis := time.Now().UnixMilli()
	for {
		elapsedMillis := time.Now().UnixMilli() - startTsMillis
		if elapsedMillis > timeout.Milliseconds() {
			break
		}

		exportedLogs := exporter.GetLogs()
		if len(exportedLogs) >= minLogCount {
			return exportedLogs, nil
		}

		time.Sleep(50 * time.Millisecond)
	}

	return exporter.GetLogs(), nil
}

func generateSimulationConfig(
	receiverId string,
	processorConfigs []ProcessorConfig,
	exporterId string,
) ([]byte, error) {
	baseConf := fmt.Sprintf(`
  receivers:
    memory:
      id: %s
  exporters:
    memory:
      id: %s
  service:
    pipelines:
      logs:
        receivers:
          - memory
        exporters:
          - memory
    telemetry:
      metrics:
        level: none
      logs:
        level: error
  `, receiverId, exporterId)

	simulationConf, err := yaml.Parser().Unmarshal([]byte(baseConf))
	if err != nil {
		return nil, err
	}

	processors := map[string]interface{}{}
	procNamesInOrder := []string{}
	for _, processorConf := range processorConfigs {
		processors[processorConf.Name] = processorConf.Config
		procNamesInOrder = append(procNamesInOrder, processorConf.Name)
	}
	simulationConf["processors"] = processors

	svc := simulationConf["service"].(map[string]interface{})
	svcPipelines := svc["pipelines"].(map[string]interface{})
	svcPipelinesLogs := svcPipelines["logs"].(map[string]interface{})
	svcPipelinesLogs["processors"] = procNamesInOrder

	simulationConfYaml, err := yaml.Parser().Marshal(simulationConf)
	if err != nil {
		return nil, err
	}

	return simulationConfYaml, nil
}
