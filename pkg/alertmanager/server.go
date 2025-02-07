package alertmanager

import (
	"context"
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
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore"
	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

var _ factory.Service = (*Server)(nil)

var (
	// This is not a real file and will never be used. We need this placeholder to ensure maintenance runs on shutdown. See
	// https://github.com/prometheus/server/blob/3ee2cd0f1271e277295c02b6160507b4d193dde2/silence/silence.go#L435-L438
	// and https://github.com/prometheus/server/blob/3b06b97af4d146e141af92885a185891eb79a5b0/nflog/nflog.go#L362.
	snapfnoop string = "snapfnoop"
)

type Server struct {
	// srvConfig is the server config for the alertmanager
	srvConfig Config
	// alertmanagerConfigHash is the hash of the alertmanager config
	alertmanagerConfigHash [16]byte
	// alertmanagerConfigRaw is the raw config of the alertmanager
	alertmanagerConfigRaw []byte
	// Settings is the factorysettings for the alertmanager
	settings factory.NamespacedSettings
	// orgID is the orgID for the alertmanager
	orgID uint64
	// store is the backing store for the alertmanager
	store alertmanagerstore.Store
	// alertmanager primitives from upstream alertmanager
	alerts          *mem.Alerts
	nflog           *nflog.Log
	dispatcher      *dispatch.Dispatcher
	inhibitor       *inhibit.Inhibitor
	silencer        *silence.Silencer
	silences        *silence.Silences
	timeIntervals   map[string][]timeinterval.TimeInterval
	pipelineBuilder *notify.PipelineBuilder
	marker          *alertmanagertypes.MemMarker
	tmpl            *template.Template
	wg              sync.WaitGroup
	stopc           chan struct{}
}

func NewForOrg(ctx context.Context, settings factory.Settings, srvConfig Config, orgID uint64, store alertmanagerstore.Store) (*Server, error) {
	server := &Server{
		srvConfig: srvConfig,
		settings:  factory.NewNamespacedSettings(settings, "go.signoz.io/signoz/pkg/alertmanager"),
		orgID:     orgID,
		store:     store,
		stopc:     make(chan struct{}),
	}
	// initialize marker
	server.marker = alertmanagertypes.NewMarker(server.settings.PrometheusRegisterer())

	// get silences for initial state
	silencesstate, err := store.GetState(ctx, server.orgID, alertmanagertypes.SilenceStateName)
	if err != nil {
		return nil, err
	}

	// get nflog for initial state
	nflogstate, err := store.GetState(ctx, server.orgID, alertmanagertypes.NFLogStateName)
	if err != nil {
		return nil, err
	}

	// Initialize silences
	server.silences, err = silence.New(silence.Options{
		SnapshotReader: strings.NewReader(silencesstate),
		Retention:      srvConfig.Silences.Retention,
		Limits: silence.Limits{
			MaxSilences:         func() int { return srvConfig.Silences.Max },
			MaxSilenceSizeBytes: func() int { return srvConfig.Silences.MaxSizeBytes },
		},
		Metrics: server.settings.PrometheusRegisterer(),
		Logger:  server.settings.Logger(),
	})
	if err != nil {
		return nil, err
	}

	// Initialize notification log
	server.nflog, err = nflog.New(nflog.Options{
		SnapshotReader: strings.NewReader(nflogstate),
		Retention:      server.srvConfig.NFLog.Retention,
		Metrics:        server.settings.PrometheusRegisterer(),
		Logger:         server.settings.Logger(),
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
				server.settings.Logger().ErrorContext(ctx, "silence garbage collection", "error", err)
				// Don't return here - we need to snapshot our state first.
			}

			return server.store.SetState(ctx, server.orgID, alertmanagertypes.SilenceStateName, server.silences)
		})

	}()

	// Start maintenance for notification logs
	server.wg.Add(1)
	go func() {
		defer server.wg.Done()
		server.nflog.Maintenance(server.srvConfig.NFLog.MaintenanceInterval, snapfnoop, server.stopc, func() (int64, error) {
			if _, err := server.nflog.GC(); err != nil {
				server.settings.Logger().ErrorContext(ctx, "notification log garbage collection", "error", err)
				// Don't return without saving the current state.
			}

			return server.store.SetState(ctx, server.orgID, alertmanagertypes.NFLogStateName, server.nflog)
		})
	}()

	server.alerts, err = mem.NewAlerts(ctx, server.marker, server.srvConfig.Alerts.GCInterval, nil, server.settings.Logger(), server.settings.PrometheusRegisterer())
	if err != nil {
		return nil, err
	}

	server.pipelineBuilder = notify.NewPipelineBuilder(server.settings.PrometheusRegisterer(), featurecontrol.NoopFlags{})

	return server, nil
}

func (server *Server) Start(ctx context.Context) error {
	config, err := server.store.GetConfig(ctx, server.orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return err
	}

	if config == nil {
		config = alertmanagertypes.NewDefaultConfig(
			server.srvConfig.ResolveTimeout,
			server.srvConfig.SMTP.Hello,
			server.srvConfig.SMTP.From,
			server.srvConfig.SMTP.Host,
			server.srvConfig.SMTP.Port,
			server.srvConfig.SMTP.AuthUsername,
			server.srvConfig.SMTP.AuthPassword,
			server.srvConfig.SMTP.AuthSecret,
			server.srvConfig.SMTP.AuthIdentity,
			server.srvConfig.SMTP.RequireTLS,
			server.srvConfig.Route.GroupBy,
			server.srvConfig.Route.GroupInterval,
			server.srvConfig.Route.GroupWait,
			server.srvConfig.Route.RepeatInterval,
		)

		if err := server.store.SetConfig(ctx, server.orgID, config); err != nil {
			server.settings.Logger().ErrorContext(ctx, "failed to set config", "error", err)
			return err
		}
	}

	return server.SetConfig(ctx, config)
}

func (server *Server) PutAlerts(ctx context.Context, postableAlerts alertmanagertypes.PostableAlerts) error {
	alerts, err := alertmanagertypes.NewAlertsFromPostableAlerts(postableAlerts, server.srvConfig.ResolveTimeout, time.Now())

	// Notification sending alert takes precedence over validation errors.
	if err := server.alerts.Put(alerts...); err != nil {
		return err
	}

	if err != nil {
		return errors.Join(err...)
	}

	return nil
}

func (server *Server) ConfigHash() [16]byte {
	return server.alertmanagerConfigHash
}

func (server *Server) ConfigRaw() []byte {
	return server.alertmanagerConfigRaw
}

func (server *Server) SetConfig(ctx context.Context, alertmanagerConfig *alertmanagertypes.Config) error {
	config := alertmanagerConfig.Config()

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
			server.settings.Logger().InfoContext(ctx, "skipping creation of receiver not referenced by any route", "receiver", rcv.Name)
			continue
		}
		integrations, err := alertmanagertypes.NewReceiverIntegrations(rcv, server.tmpl, server.settings.Logger())
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

	server.inhibitor = inhibit.NewInhibitor(server.alerts, config.InhibitRules, server.marker, server.settings.Logger())
	server.timeIntervals = timeIntervals
	server.silencer = silence.NewSilencer(server.silences, server.marker, server.settings.Logger())

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
		server.settings.Logger(),
		dispatch.NewDispatcherMetrics(false, server.settings.PrometheusRegisterer()),
	)

	// Do not try to add these to `server.wg as there seems to be a race condition if
	// we call Start() and Stop() in quick succession.
	// Both these goroutines will run indefinitely.
	go server.dispatcher.Run()
	go server.inhibitor.Run()

	server.alertmanagerConfigHash = alertmanagerConfig.Hash()
	server.alertmanagerConfigRaw = alertmanagerConfig.Raw()

	return nil
}

func (server *Server) TestReceiver(ctx context.Context, receiver alertmanagertypes.Receiver) error {
	return alertmanagertypes.TestReceiver(ctx, receiver, server.tmpl, server.settings.Logger())
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
