package app

import (
	"context"
	"fmt"
	"net"
	"net/http"
	_ "net/http/pprof" // http profiler
	"slices"

	"github.com/hanzoai/o11y/pkg/cache/memorycache"
	"github.com/hanzoai/o11y/pkg/factory"
	"github.com/hanzoai/o11y/pkg/queryparser"
	"github.com/hanzoai/o11y/pkg/ruler/rulestore/sqlrulestore"
	"github.com/hanzoai/o11y/pkg/types/telemetrytypes"

	"github.com/gorilla/handlers"

	"github.com/hanzoai/o11y/pkg/alertmanager"
	"github.com/hanzoai/o11y/pkg/cache"
	"github.com/hanzoai/o11y/pkg/http/middleware"
	"github.com/hanzoai/o11y/pkg/licensing/nooplicensing"
	"github.com/hanzoai/o11y/pkg/modules/organization"
	"github.com/hanzoai/o11y/pkg/prometheus"
	"github.com/hanzoai/o11y/pkg/querier"
	"github.com/hanzoai/o11y/pkg/query-service/agentConf"
	"github.com/hanzoai/o11y/pkg/query-service/app/clickhouseReader"
	"github.com/hanzoai/o11y/pkg/query-service/app/cloudintegrations"
	"github.com/hanzoai/o11y/pkg/query-service/app/integrations"
	"github.com/hanzoai/o11y/pkg/query-service/app/logparsingpipeline"
	"github.com/hanzoai/o11y/pkg/query-service/app/opamp"
	opAmpModel "github.com/hanzoai/o11y/pkg/query-service/app/opamp/model"
	"github.com/hanzoai/o11y/pkg/query-service/interfaces"
	"github.com/hanzoai/o11y/pkg/o11y"
	"github.com/hanzoai/o11y/pkg/sqlstore"
	"github.com/hanzoai/o11y/pkg/telemetrystore"
	"github.com/hanzoai/o11y/pkg/web"
	"github.com/rs/cors"
	"github.com/soheilhy/cmux"

	"github.com/hanzoai/o11y/pkg/query-service/constants"
	"github.com/hanzoai/o11y/pkg/query-service/healthcheck"
	"github.com/hanzoai/o11y/pkg/query-service/rules"
	"github.com/hanzoai/o11y/pkg/query-service/utils"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gorilla/mux/otelmux"
	"go.opentelemetry.io/otel/propagation"
	"log/slog"
	"go.uber.org/zap" //nolint:depguard
)

// Server runs HTTP, Mux and a grpc server
type Server struct {
	config      o11y.Config
	o11y      *o11y.HanzoO11y
	ruleManager *rules.Manager

	// public http router
	httpConn     net.Listener
	httpServer   *http.Server
	httpHostPort string

	opampServer *opamp.Server

	unavailableChannel chan healthcheck.Status
}

// NewServer creates and initializes Server
func NewServer(config o11y.Config, o11y *o11y.HanzoO11y) (*Server, error) {
	integrationsController, err := integrations.NewController(o11y.SQLStore)
	if err != nil {
		return nil, err
	}

	cloudIntegrationsController, err := cloudintegrations.NewController(o11y.SQLStore)
	if err != nil {
		return nil, err
	}

	cacheForTraceDetail, err := memorycache.New(context.TODO(), o11y.Instrumentation.ToProviderSettings(), cache.Config{
		Provider: "memory",
		Memory: cache.Memory{
			NumCounters: 10 * 10000,
			MaxCost:     1 << 27, // 128 MB
		},
	})
	if err != nil {
		return nil, err
	}

	reader := clickhouseReader.NewReader(
		o11y.SQLStore,
		o11y.TelemetryStore,
		o11y.Prometheus,
		o11y.TelemetryStore.Cluster(),
		config.Querier.FluxInterval,
		cacheForTraceDetail,
		o11y.Cache,
		nil,
	)

	rm, err := makeRulesManager(
		reader,
		o11y.Cache,
		o11y.Alertmanager,
		o11y.SQLStore,
		o11y.TelemetryStore,
		o11y.TelemetryMetadataStore,
		o11y.Prometheus,
		o11y.Modules.OrgGetter,
		o11y.Querier,
		o11y.Instrumentation.ToProviderSettings(),
		o11y.QueryParser,
	)
	if err != nil {
		return nil, err
	}

	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		o11y.SQLStore,
		integrationsController.GetPipelinesForInstalledIntegrations,
	)
	if err != nil {
		return nil, err
	}

	apiHandler, err := NewAPIHandler(APIHandlerOpts{
		Reader:                        reader,
		RuleManager:                   rm,
		IntegrationsController:        integrationsController,
		CloudIntegrationsController:   cloudIntegrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		FluxInterval:                  config.Querier.FluxInterval,
		AlertmanagerAPI:               alertmanager.NewAPI(o11y.Alertmanager),
		LicensingAPI:                  nooplicensing.NewLicenseAPI(),
		O11y:                        o11y,
		QueryParserAPI:                queryparser.NewAPI(o11y.Instrumentation.ToProviderSettings(), o11y.QueryParser),
	}, config)
	if err != nil {
		return nil, err
	}

	s := &Server{
		config:             config,
		o11y:             o11y,
		ruleManager:        rm,
		httpHostPort:       constants.HTTPHostPort,
		unavailableChannel: make(chan healthcheck.Status),
	}

	httpServer, err := s.createPublicServer(apiHandler, o11y.Web)

	if err != nil {
		return nil, err
	}

	s.httpServer = httpServer

	opAmpModel.Init(o11y.SQLStore, o11y.Instrumentation.Logger(), o11y.Modules.OrgGetter)

	agentConfMgr, err := agentConf.Initiate(
		&agentConf.ManagerOptions{
			Store: o11y.SQLStore,
			AgentFeatures: []agentConf.AgentFeature{
				logParsingPipelineController,
			},
		},
	)
	if err != nil {
		return nil, err
	}

	s.opampServer = opamp.InitializeServer(
		&opAmpModel.AllAgents,
		agentConfMgr,
		o11y.Instrumentation,
	)

	return s, nil
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

func (s *Server) createPublicServer(api *APIHandler, web web.Web) (*http.Server, error) {
	r := NewRouter()

	// Rewrite /v1/o11y/* to /api/* so external clients use the
	// /<version>/<service>/<path> convention while internal routes stay unchanged.
	r.Use(middleware.NewRewrite("/v1/o11y", "/api").Wrap)

	r.Use(otelmux.Middleware(
		"apiserver",
		otelmux.WithMeterProvider(s.o11y.Instrumentation.MeterProvider()),
		otelmux.WithTracerProvider(s.o11y.Instrumentation.TracerProvider()),
		otelmux.WithPropagators(propagation.NewCompositeTextMapPropagator(propagation.Baggage{}, propagation.TraceContext{})),
		otelmux.WithFilter(func(r *http.Request) bool {
			return !slices.Contains([]string{"/api/v1/health"}, r.URL.Path)
		}),
		otelmux.WithPublicEndpoint(),
	))
	r.Use(middleware.NewAuthN([]string{"Authorization", "Sec-WebSocket-Protocol"}, s.o11y.Sharder, s.o11y.Tokenizer, s.o11y.Instrumentation.Logger()).Wrap)
	r.Use(middleware.NewTimeout(s.o11y.Instrumentation.Logger(),
		s.config.APIServer.Timeout.ExcludedRoutes,
		s.config.APIServer.Timeout.Default,
		s.config.APIServer.Timeout.Max,
	).Wrap)
	r.Use(middleware.NewAPIKey(s.o11y.SQLStore, []string{"HANZO-API-KEY"}, s.o11y.Instrumentation.Logger(), s.o11y.Sharder).Wrap)
	r.Use(middleware.NewLogging(s.o11y.Instrumentation.Logger(), s.config.APIServer.Logging.ExcludedRoutes).Wrap)
	r.Use(middleware.NewComment().Wrap)

	am := middleware.NewAuthZ(s.o11y.Instrumentation.Logger(), s.o11y.Modules.OrgGetter, s.o11y.Authz)

	api.RegisterRoutes(r, am)
	api.RegisterLogsRoutes(r, am)
	api.RegisterIntegrationRoutes(r, am)
	api.RegisterCloudIntegrationsRoutes(r, am)
	api.RegisterQueryRangeV3Routes(r, am)
	api.RegisterInfraMetricsRoutes(r, am)
	api.RegisterWebSocketPaths(r, am)
	api.RegisterQueryRangeV4Routes(r, am)
	api.RegisterMessagingQueuesRoutes(r, am)
	api.RegisterThirdPartyApiRoutes(r, am)
	api.MetricExplorerRoutes(r, am)
	api.RegisterTraceFunnelsRoutes(r, am)

	err := s.o11y.APIServer.AddToRouter(r)
	if err != nil {
		return nil, err
	}

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "cache-control", "X-O11Y-QUERY-ID", "Sec-WebSocket-Protocol"},
	})

	handler := c.Handler(r)

	handler = handlers.CompressHandler(handler)

	err = web.AddToRouter(r)
	if err != nil {
		return nil, err
	}

	return &http.Server{
		Handler: handler,
	}, nil
}

// initListeners initialises listeners of the server
func (s *Server) initListeners() error {
	// listen on public port
	var err error
	publicHostPort := s.httpHostPort
	if publicHostPort == "" {
		return fmt.Errorf("constants.HTTPHostPort is required")
	}

	s.httpConn, err = net.Listen("tcp", publicHostPort)
	if err != nil {
		return err
	}

	slog.Info(fmt.Sprintf("Query server started listening on %s...", s.httpHostPort))

	return nil
}

// Start listening on http and private http port concurrently
func (s *Server) Start(ctx context.Context) error {
	s.ruleManager.Start(ctx)

	err := s.initListeners()
	if err != nil {
		return err
	}

	var httpPort int
	if port, err := utils.GetPort(s.httpConn.Addr()); err == nil {
		httpPort = port
	}

	go func() {
		slog.Info("Starting HTTP server", "port", httpPort, "addr", s.httpHostPort)

		switch err := s.httpServer.Serve(s.httpConn); err {
		case nil, http.ErrServerClosed, cmux.ErrListenerClosed:
			// normal exit, nothing to do
		default:
			slog.Error("Could not start HTTP server", "error", err)
		}
		s.unavailableChannel <- healthcheck.Unavailable
	}()

	go func() {
		slog.Info("Starting pprof server", "addr", constants.DebugHttpPort)

		err = http.ListenAndServe(constants.DebugHttpPort, nil)
		if err != nil {
			slog.Error("Could not start pprof server", "error", err)
		}
	}()

	go func() {
		slog.Info("Starting OpAmp Websocket server", "addr", constants.OpAmpWsEndpoint)
		err := s.opampServer.Start(constants.OpAmpWsEndpoint)
		if err != nil {
			slog.Info("opamp ws server failed to start", "error", err)
			s.unavailableChannel <- healthcheck.Unavailable
		}
	}()

	return nil
}

func (s *Server) Stop(ctx context.Context) error {
	if s.httpServer != nil {
		if err := s.httpServer.Shutdown(context.Background()); err != nil {
			return err
		}
	}

	s.opampServer.Stop()

	if s.ruleManager != nil {
		s.ruleManager.Stop(ctx)
	}

	return nil
}

func makeRulesManager(
	ch interfaces.Reader,
	cache cache.Cache,
	alertmanager alertmanager.Alertmanager,
	sqlstore sqlstore.SQLStore,
	telemetryStore telemetrystore.TelemetryStore,
	metadataStore telemetrytypes.MetadataStore,
	prometheus prometheus.Prometheus,
	orgGetter organization.Getter,
	querier querier.Querier,
	providerSettings factory.ProviderSettings,
	queryParser queryparser.QueryParser,
) (*rules.Manager, error) {
	ruleStore := sqlrulestore.NewRuleStore(sqlstore, queryParser, providerSettings)
	maintenanceStore := sqlrulestore.NewMaintenanceStore(sqlstore)
	// create manager opts
	managerOpts := &rules.ManagerOptions{
		TelemetryStore:   telemetryStore,
		MetadataStore:    metadataStore,
		Prometheus:       prometheus,
		Context:          context.Background(),
		Logger:           zap.L(),
		Reader:           ch,
		Querier:          querier,
		SLogger:          providerSettings.Logger,
		Cache:            cache,
		EvalDelay:        constants.GetEvalDelay(),
		OrgGetter:        orgGetter,
		Alertmanager:     alertmanager,
		RuleStore:        ruleStore,
		MaintenanceStore: maintenanceStore,
		SqlStore:         sqlstore,
		QueryParser:      queryParser,
	}

	// create Manager
	manager, err := rules.NewManager(managerOpts)
	if err != nil {
		return nil, fmt.Errorf("rule manager error: %v", err)
	}

	slog.Info("rules manager is ready")

	return manager, nil
}
