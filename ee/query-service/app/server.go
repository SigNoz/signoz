package app

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	_ "net/http/pprof" // http profiler
	"slices"

	"github.com/SigNoz/signoz/pkg/cache/memorycache"
	"github.com/SigNoz/signoz/pkg/ruler/rulestore/sqlrulestore"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gorilla/mux/otelmux"
	"go.opentelemetry.io/otel/propagation"

	"github.com/gorilla/handlers"

	"github.com/SigNoz/signoz/ee/query-service/app/api"
	"github.com/SigNoz/signoz/ee/query-service/integrations/gateway"
	"github.com/SigNoz/signoz/ee/query-service/rules"
	"github.com/SigNoz/signoz/ee/query-service/usage"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/rs/cors"
	"github.com/soheilhy/cmux"

	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	baseapp "github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	"github.com/SigNoz/signoz/pkg/query-service/app/opamp"
	opAmpModel "github.com/SigNoz/signoz/pkg/query-service/app/opamp/model"
	baseconst "github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/healthcheck"
	baseint "github.com/SigNoz/signoz/pkg/query-service/interfaces"
	baserules "github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
)

// Server runs HTTP, Mux and a grpc server
type Server struct {
	config      signoz.Config
	signoz      *signoz.SigNoz
	ruleManager *baserules.Manager

	// public http router
	httpConn     net.Listener
	httpServer   *http.Server
	httpHostPort string

	opampServer *opamp.Server

	// Usage manager
	usageManager *usage.Manager

	unavailableChannel chan healthcheck.Status
}

// NewServer creates and initializes Server
func NewServer(config signoz.Config, signoz *signoz.SigNoz) (*Server, error) {
	gatewayProxy, err := gateway.NewProxy(config.Gateway.URL.String(), gateway.RoutePrefix)
	if err != nil {
		return nil, err
	}

	cacheForTraceDetail, err := memorycache.New(context.TODO(), signoz.Instrumentation.ToProviderSettings(), cache.Config{
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
		signoz.SQLStore,
		signoz.TelemetryStore,
		signoz.Prometheus,
		signoz.TelemetryStore.Cluster(),
		config.Querier.FluxInterval,
		cacheForTraceDetail,
		signoz.Cache,
		nil,
	)

	rm, err := makeRulesManager(
		reader,
		signoz.Cache,
		signoz.Alertmanager,
		signoz.SQLStore,
		signoz.TelemetryStore,
		signoz.Prometheus,
		signoz.Modules.OrgGetter,
		signoz.Querier,
		signoz.Instrumentation.Logger(),
	)

	if err != nil {
		return nil, err
	}

	// initiate opamp
	opAmpModel.Init(signoz.SQLStore, signoz.Instrumentation.Logger(), signoz.Modules.OrgGetter)

	integrationsController, err := integrations.NewController(signoz.SQLStore)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't create integrations controller: %w", err,
		)
	}

	cloudIntegrationsController, err := cloudintegrations.NewController(signoz.SQLStore)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't create cloud provider integrations controller: %w", err,
		)
	}

	// ingestion pipelines manager
	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		signoz.SQLStore,
		integrationsController.GetPipelinesForInstalledIntegrations,
	)
	if err != nil {
		return nil, err
	}

	// initiate agent config handler
	agentConfMgr, err := agentConf.Initiate(&agentConf.ManagerOptions{
		Store:         signoz.SQLStore,
		AgentFeatures: []agentConf.AgentFeature{logParsingPipelineController},
	})
	if err != nil {
		return nil, err
	}

	// start the usagemanager
	usageManager, err := usage.New(signoz.Licensing, signoz.TelemetryStore.ClickhouseDB(), signoz.Zeus, signoz.Modules.OrgGetter)
	if err != nil {
		return nil, err
	}
	err = usageManager.Start(context.Background())
	if err != nil {
		return nil, err
	}

	apiOpts := api.APIHandlerOptions{
		DataConnector:                 reader,
		RulesManager:                  rm,
		UsageManager:                  usageManager,
		IntegrationsController:        integrationsController,
		CloudIntegrationsController:   cloudIntegrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		FluxInterval:                  config.Querier.FluxInterval,
		Gateway:                       gatewayProxy,
		GatewayUrl:                    config.Gateway.URL.String(),
	}

	apiHandler, err := api.NewAPIHandler(apiOpts, signoz)
	if err != nil {
		return nil, err
	}

	s := &Server{
		config:             config,
		signoz:             signoz,
		ruleManager:        rm,
		httpHostPort:       baseconst.HTTPHostPort,
		unavailableChannel: make(chan healthcheck.Status),
		usageManager:       usageManager,
	}

	httpServer, err := s.createPublicServer(apiHandler, signoz.Web)

	if err != nil {
		return nil, err
	}

	s.httpServer = httpServer

	s.opampServer = opamp.InitializeServer(
		&opAmpModel.AllAgents, agentConfMgr, signoz.Instrumentation,
	)

	return s, nil
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

func (s *Server) createPublicServer(apiHandler *api.APIHandler, web web.Web) (*http.Server, error) {
	r := baseapp.NewRouter()
	am := middleware.NewAuthZ(s.signoz.Instrumentation.Logger(), s.signoz.Modules.OrgGetter, s.signoz.Authz)

	r.Use(otelmux.Middleware(
		"apiserver",
		otelmux.WithMeterProvider(s.signoz.Instrumentation.MeterProvider()),
		otelmux.WithTracerProvider(s.signoz.Instrumentation.TracerProvider()),
		otelmux.WithPropagators(propagation.NewCompositeTextMapPropagator(propagation.Baggage{}, propagation.TraceContext{})),
		otelmux.WithFilter(func(r *http.Request) bool {
			return !slices.Contains([]string{"/api/v1/health"}, r.URL.Path)
		}),
		otelmux.WithPublicEndpoint(),
	))
	r.Use(middleware.NewAuthN([]string{"Authorization", "Sec-WebSocket-Protocol"}, s.signoz.Sharder, s.signoz.Tokenizer, s.signoz.Instrumentation.Logger()).Wrap)
	r.Use(middleware.NewAPIKey(s.signoz.SQLStore, []string{"SIGNOZ-API-KEY"}, s.signoz.Instrumentation.Logger(), s.signoz.Sharder).Wrap)
	r.Use(middleware.NewTimeout(s.signoz.Instrumentation.Logger(),
		s.config.APIServer.Timeout.ExcludedRoutes,
		s.config.APIServer.Timeout.Default,
		s.config.APIServer.Timeout.Max,
	).Wrap)
	r.Use(middleware.NewLogging(s.signoz.Instrumentation.Logger(), s.config.APIServer.Logging.ExcludedRoutes).Wrap)
	r.Use(middleware.NewComment().Wrap)

	apiHandler.RegisterRoutes(r, am)
	apiHandler.RegisterLogsRoutes(r, am)
	apiHandler.RegisterIntegrationRoutes(r, am)
	apiHandler.RegisterCloudIntegrationsRoutes(r, am)
	apiHandler.RegisterFieldsRoutes(r, am)
	apiHandler.RegisterQueryRangeV3Routes(r, am)
	apiHandler.RegisterInfraMetricsRoutes(r, am)
	apiHandler.RegisterQueryRangeV4Routes(r, am)
	apiHandler.RegisterQueryRangeV5Routes(r, am)
	apiHandler.RegisterWebSocketPaths(r, am)
	apiHandler.RegisterMessagingQueuesRoutes(r, am)
	apiHandler.RegisterThirdPartyApiRoutes(r, am)
	apiHandler.MetricExplorerRoutes(r, am)
	apiHandler.RegisterTraceFunnelsRoutes(r, am)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "cache-control", "X-SIGNOZ-QUERY-ID", "Sec-WebSocket-Protocol"},
	})

	handler := c.Handler(r)

	handler = handlers.CompressHandler(handler)

	err := web.AddToRouter(r)
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
		return fmt.Errorf("baseconst.HTTPHostPort is required")
	}

	s.httpConn, err = net.Listen("tcp", publicHostPort)
	if err != nil {
		return err
	}

	zap.L().Info(fmt.Sprintf("Query server started listening on %s...", s.httpHostPort))

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
		zap.L().Info("Starting HTTP server", zap.Int("port", httpPort), zap.String("addr", s.httpHostPort))

		switch err := s.httpServer.Serve(s.httpConn); err {
		case nil, http.ErrServerClosed, cmux.ErrListenerClosed:
			// normal exit, nothing to do
		default:
			zap.L().Error("Could not start HTTP server", zap.Error(err))
		}
		s.unavailableChannel <- healthcheck.Unavailable
	}()

	go func() {
		zap.L().Info("Starting pprof server", zap.String("addr", baseconst.DebugHttpPort))

		err = http.ListenAndServe(baseconst.DebugHttpPort, nil)
		if err != nil {
			zap.L().Error("Could not start pprof server", zap.Error(err))
		}
	}()

	go func() {
		zap.L().Info("Starting OpAmp Websocket server", zap.String("addr", baseconst.OpAmpWsEndpoint))
		err := s.opampServer.Start(baseconst.OpAmpWsEndpoint)
		if err != nil {
			zap.L().Error("opamp ws server failed to start", zap.Error(err))
			s.unavailableChannel <- healthcheck.Unavailable
		}
	}()

	return nil
}

func (s *Server) Stop(ctx context.Context) error {
	if s.httpServer != nil {
		if err := s.httpServer.Shutdown(ctx); err != nil {
			return err
		}
	}

	s.opampServer.Stop()

	if s.ruleManager != nil {
		s.ruleManager.Stop(ctx)
	}

	// stop usage manager
	s.usageManager.Stop(ctx)

	return nil
}

func makeRulesManager(ch baseint.Reader, cache cache.Cache, alertmanager alertmanager.Alertmanager, sqlstore sqlstore.SQLStore, telemetryStore telemetrystore.TelemetryStore, prometheus prometheus.Prometheus, orgGetter organization.Getter, querier querier.Querier, logger *slog.Logger) (*baserules.Manager, error) {
	ruleStore := sqlrulestore.NewRuleStore(sqlstore)
	maintenanceStore := sqlrulestore.NewMaintenanceStore(sqlstore)
	// create manager opts
	managerOpts := &baserules.ManagerOptions{
		TelemetryStore:      telemetryStore,
		Prometheus:          prometheus,
		Context:             context.Background(),
		Logger:              zap.L(),
		Reader:              ch,
		Querier:             querier,
		SLogger:             logger,
		Cache:               cache,
		EvalDelay:           baseconst.GetEvalDelay(),
		PrepareTaskFunc:     rules.PrepareTaskFunc,
		PrepareTestRuleFunc: rules.TestNotification,
		Alertmanager:        alertmanager,
		OrgGetter:           orgGetter,
		RuleStore:           ruleStore,
		MaintenanceStore:    maintenanceStore,
		SqlStore:            sqlstore,
	}

	// create Manager
	manager, err := baserules.NewManager(managerOpts)
	if err != nil {
		return nil, fmt.Errorf("rule manager error: %v", err)
	}

	zap.L().Info("rules manager is ready")

	return manager, nil
}
