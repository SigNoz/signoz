package server

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/prometheus/alertmanager/dispatch"
	"github.com/prometheus/alertmanager/featurecontrol"
	"github.com/prometheus/alertmanager/inhibit"
	"github.com/prometheus/alertmanager/nflog"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/provider/mem"
	"github.com/prometheus/alertmanager/silence"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/timeinterval"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/common/model"
	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

var (
	// This is not a real file and will never be used. We need this placeholder to ensure maintenance runs on shutdown. See
	// https://github.com/prometheus/server/blob/3ee2cd0f1271e277295c02b6160507b4d193dde2/silence/silence.go#L435-L438
	// and https://github.com/prometheus/server/blob/3b06b97af4d146e141af92885a185891eb79a5b0/nflog/nflog.go#L362.
	snapfnoop string = "snapfnoop"
)

type Server struct {
	// logger is the logger for the alertmanager
	logger *slog.Logger

	// registry is the prometheus registry for the alertmanager
	registry prometheus.Registerer

	// srvConfig is the server config for the alertmanager
	srvConfig Config

	// alertmanagerConfig is the config of the alertmanager
	alertmanagerConfig *alertmanagertypes.Config

	// orgID is the orgID for the alertmanager
	orgID string

	// store is the backing store for the alertmanager
	stateStore alertmanagertypes.StateStore

	// alertmanager primitives from upstream alertmanager
	alerts            *mem.Alerts
	nflog             *nflog.Log
	dispatcher        *dispatch.Dispatcher
	dispatcherMetrics *dispatch.DispatcherMetrics
	inhibitor         *inhibit.Inhibitor
	silencer          *silence.Silencer
	silences          *silence.Silences
	timeIntervals     map[string][]timeinterval.TimeInterval
	pipelineBuilder   *notify.PipelineBuilder
	marker            *alertmanagertypes.MemMarker
	tmpl              *template.Template
	wg                sync.WaitGroup
	stopc             chan struct{}
}

func New(ctx context.Context, logger *slog.Logger, registry prometheus.Registerer, srvConfig Config, orgID string, stateStore alertmanagertypes.StateStore) (*Server, error) {
	server := &Server{
		logger:     logger.With("pkg", "go.signoz.io/pkg/alertmanager/server"),
		registry:   registry,
		srvConfig:  srvConfig,
		orgID:      orgID,
		stateStore: stateStore,
		stopc:      make(chan struct{}),
	}
	// initialize marker
	server.marker = alertmanagertypes.NewMarker(server.registry)

	// get silences for initial state
	state, err := server.stateStore.Get(ctx, server.orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	silencesSnapshot := ""
	if state != nil {
		silencesSnapshot = state.Silences
	}
	// Initialize silences
	server.silences, err = silence.New(silence.Options{
		SnapshotReader: strings.NewReader(silencesSnapshot),
		Retention:      srvConfig.Silences.Retention,
		Limits: silence.Limits{
			MaxSilences:         func() int { return srvConfig.Silences.Max },
			MaxSilenceSizeBytes: func() int { return srvConfig.Silences.MaxSizeBytes },
		},
		Metrics: server.registry,
		Logger:  server.logger,
	})
	if err != nil {
		return nil, err
	}

	nflogSnapshot := ""
	if state != nil {
		nflogSnapshot = state.NFLog
	}

	// Initialize notification log
	server.nflog, err = nflog.New(nflog.Options{
		SnapshotReader: strings.NewReader(nflogSnapshot),
		Retention:      server.srvConfig.NFLog.Retention,
		Metrics:        server.registry,
		Logger:         server.logger,
	})
	if err != nil {
		return nil, err
	}

	// Start maintenance for silences
	server.wg.Add(1)
	go func() {
		defer server.wg.Done()
		server.silences.Maintenance(server.srvConfig.Silences.MaintenanceInterval, snapfnoop, server.stopc, func() (int64, error) {
			// Delete silences older than the retention period.
			if _, err := server.silences.GC(); err != nil {
				server.logger.ErrorContext(ctx, "silence garbage collection", "error", err)
				// Don't return here - we need to snapshot our state first.
			}

			state, err := server.stateStore.Get(ctx, server.orgID)
			if err != nil && !errors.Ast(err, errors.TypeNotFound) {
				return 0, err
			}

			if state == nil {
				state = alertmanagertypes.NewStoreableState(server.orgID)
			}

			c, err := state.Set(alertmanagertypes.SilenceStateName, server.silences)
			if err != nil {
				return 0, err
			}

			return c, server.stateStore.Set(ctx, server.orgID, state)
		})

	}()

	// Start maintenance for notification logs
	server.wg.Add(1)
	go func() {
		defer server.wg.Done()
		server.nflog.Maintenance(server.srvConfig.NFLog.MaintenanceInterval, snapfnoop, server.stopc, func() (int64, error) {
			if _, err := server.nflog.GC(); err != nil {
				server.logger.ErrorContext(ctx, "notification log garbage collection", "error", err)
				// Don't return without saving the current state.
			}

			state, err := server.stateStore.Get(ctx, server.orgID)
			if err != nil && !errors.Ast(err, errors.TypeNotFound) {
				return 0, err
			}

			if state == nil {
				state = alertmanagertypes.NewStoreableState(server.orgID)
			}

			c, err := state.Set(alertmanagertypes.NFLogStateName, server.nflog)
			if err != nil {
				return 0, err
			}

			return c, server.stateStore.Set(ctx, server.orgID, state)
		})
	}()

	server.alerts, err = mem.NewAlerts(ctx, server.marker, server.srvConfig.Alerts.GCInterval, nil, server.logger, server.registry)
	if err != nil {
		return nil, err
	}

	server.pipelineBuilder = notify.NewPipelineBuilder(server.registry, featurecontrol.NoopFlags{})
	server.dispatcherMetrics = dispatch.NewDispatcherMetrics(false, server.registry)

	return server, nil
}

func (server *Server) GetAlerts(ctx context.Context, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.GettableAlerts, error) {
	return alertmanagertypes.NewGettableAlertsFromAlertProvider(server.alerts, server.alertmanagerConfig, server.marker.Status, func(labels model.LabelSet) {
		server.inhibitor.Mutes(labels)
		server.silencer.Mutes(labels)
	}, params)
}

func (server *Server) PutAlerts(ctx context.Context, postableAlerts alertmanagertypes.PostableAlerts) error {
	alerts, err := alertmanagertypes.NewAlertsFromPostableAlerts(postableAlerts, time.Duration(server.srvConfig.Global.ResolveTimeout), time.Now())

	// Notification sending alert takes precedence over validation errors.
	if err := server.alerts.Put(alerts...); err != nil {
		return err
	}

	if err != nil {
		return errors.Join(err...)
	}

	return nil
}

func (server *Server) SetConfig(ctx context.Context, alertmanagerConfig *alertmanagertypes.Config) error {
	config := alertmanagerConfig.AlertmanagerConfig()

	var err error
	server.tmpl, err = template.FromGlobs(config.Templates)
	if err != nil {
		return err
	}

	server.tmpl.ExternalURL = server.srvConfig.ExternalUrl

	// Build the routing tree and record which receivers are used.
	routes := dispatch.NewRoute(config.Route, nil)
	activeReceivers := make(map[string]struct{})
	routes.Walk(func(r *dispatch.Route) {
		activeReceivers[r.RouteOpts.Receiver] = struct{}{}
	})

	// Build the map of receiver to integrations.
	receivers := make(map[string][]notify.Integration, len(activeReceivers))
	var integrationsNum int
	for _, rcv := range config.Receivers {
		if _, found := activeReceivers[rcv.Name]; !found {
			// No need to build a receiver if no route is using it.
			server.logger.InfoContext(ctx, "skipping creation of receiver not referenced by any route", "receiver", rcv.Name)
			continue
		}
		integrations, err := alertmanagertypes.NewReceiverIntegrations(rcv, server.tmpl, server.logger)
		if err != nil {
			return err
		}
		// rcv.Name is guaranteed to be unique across all receivers.
		receivers[rcv.Name] = integrations
		integrationsNum += len(integrations)
	}

	// Build the map of time interval names to time interval definitions.
	timeIntervals := make(map[string][]timeinterval.TimeInterval, len(config.MuteTimeIntervals)+len(config.TimeIntervals))
	for _, ti := range config.MuteTimeIntervals {
		timeIntervals[ti.Name] = ti.TimeIntervals
	}

	for _, ti := range config.TimeIntervals {
		timeIntervals[ti.Name] = ti.TimeIntervals
	}

	intervener := timeinterval.NewIntervener(timeIntervals)

	if server.inhibitor != nil {
		server.inhibitor.Stop()
	}
	if server.dispatcher != nil {
		server.dispatcher.Stop()
	}

	server.inhibitor = inhibit.NewInhibitor(server.alerts, config.InhibitRules, server.marker, server.logger)
	server.timeIntervals = timeIntervals
	server.silencer = silence.NewSilencer(server.silences, server.marker, server.logger)

	var pipelinePeer notify.Peer
	pipeline := server.pipelineBuilder.New(
		receivers,
		func() time.Duration { return 0 },
		server.inhibitor,
		server.silencer,
		intervener,
		server.marker,
		server.nflog,
		pipelinePeer,
	)

	timeoutFunc := func(d time.Duration) time.Duration {
		if d < notify.MinTimeout {
			d = notify.MinTimeout
		}
		return d
	}

	server.dispatcher = dispatch.NewDispatcher(
		server.alerts,
		routes,
		pipeline,
		server.marker,
		timeoutFunc,
		nil,
		server.logger,
		server.dispatcherMetrics,
	)

	// Do not try to add these to server.wg as there seems to be a race condition if
	// we call Start() and Stop() in quick succession.
	// Both these goroutines will run indefinitely.
	go server.dispatcher.Run()
	go server.inhibitor.Run()

	server.alertmanagerConfig = alertmanagerConfig
	return nil
}

func (server *Server) TestReceiver(ctx context.Context, receiver alertmanagertypes.Receiver) error {
	return alertmanagertypes.TestReceiver(ctx, receiver, server.tmpl, server.logger)
}

func (server *Server) Stop(ctx context.Context) error {
	if server.dispatcher != nil {
		server.dispatcher.Stop()
	}

	if server.inhibitor != nil {
		server.inhibitor.Stop()
	}

	// Close the alert provider.
	server.alerts.Close()

	// Signals maintenance goroutines of server states to stop.
	close(server.stopc)

	// Wait for all goroutines to finish.
	server.wg.Wait()

	return nil
}
