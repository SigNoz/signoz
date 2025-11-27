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

	"github.com/gorilla/handlers"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/apis/fields"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/licensing/nooplicensing"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/querier"
	querierAPI "github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	"github.com/SigNoz/signoz/pkg/query-service/app/opamp"
	opAmpModel "github.com/SigNoz/signoz/pkg/query-service/app/opamp/model"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/web"
	"github.com/rs/cors"
	"github.com/soheilhy/cmux"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/healthcheck"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gorilla/mux/otelmux"
	"go.opentelemetry.io/otel/propagation"
	"go.uber.org/zap"
)

// Server runs HTTP, Mux and a grpc server
type Server struct {
	config      signoz.Config
	signoz      *signoz.SigNoz
	ruleManager *rules.Manager

	// public http router
	httpConn     net.Listener
	httpServer   *http.Server
	httpHostPort string

	opampServer *opamp.Server

	unavailableChannel chan healthcheck.Status
}

// NewServer creates and initializes Server
func NewServer(config signoz.Config, signoz *signoz.SigNoz) (*Server, error) {
	integrationsController, err := integrations.NewController(signoz.SQLStore)
	if err != nil {
		return nil, err
	}

	cloudIntegrationsController, err := cloudintegrations.NewController(signoz.SQLStore)
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

	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		signoz.SQLStore,
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
		AlertmanagerAPI:               alertmanager.NewAPI(signoz.Alertmanager),
		LicensingAPI:                  nooplicensing.NewLicenseAPI(),
		FieldsAPI:                     fields.NewAPI(signoz.Instrumentation.ToProviderSettings(), signoz.TelemetryStore),
		Signoz:                        signoz,
		QuerierAPI:                    querierAPI.NewAPI(signoz.Instrumentation.ToProviderSettings(), signoz.Querier, signoz.Analytics),
	})
	if err != nil {
		return nil, err
	}

	s := &Server{
		config:             config,
		signoz:             signoz,
		ruleManager:        rm,
		httpHostPort:       constants.HTTPHostPort,
		unavailableChannel: make(chan healthcheck.Status),
	}

	httpServer, err := s.createPublicServer(apiHandler, signoz.Web)

	if err != nil {
		return nil, err
	}

	s.httpServer = httpServer

	opAmpModel.Init(signoz.SQLStore, signoz.Instrumentation.Logger(), signoz.Modules.OrgGetter)

	agentConfMgr, err := agentConf.Initiate(
		&agentConf.ManagerOptions{
			Store: signoz.SQLStore,
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
		signoz.Instrumentation,
	)

	return s, nil
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

func (s *Server) createPublicServer(api *APIHandler, web web.Web) (*http.Server, error) {
	r := NewRouter()

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
	r.Use(middleware.NewTimeout(s.signoz.Instrumentation.Logger(),
		s.config.APIServer.Timeout.ExcludedRoutes,
		s.config.APIServer.Timeout.Default,
		s.config.APIServer.Timeout.Max,
	).Wrap)
	r.Use(middleware.NewAPIKey(s.signoz.SQLStore, []string{"SIGNOZ-API-KEY"}, s.signoz.Instrumentation.Logger(), s.signoz.Sharder).Wrap)
	r.Use(middleware.NewLogging(s.signoz.Instrumentation.Logger(), s.config.APIServer.Logging.ExcludedRoutes).Wrap)
	r.Use(middleware.NewComment().Wrap)

	am := middleware.NewAuthZ(s.signoz.Instrumentation.Logger(), s.signoz.Modules.OrgGetter, s.signoz.Authz)

	api.RegisterRoutes(r, am)
	api.RegisterLogsRoutes(r, am)
	api.RegisterIntegrationRoutes(r, am)
	api.RegisterCloudIntegrationsRoutes(r, am)
	api.RegisterFieldsRoutes(r, am)
	api.RegisterQueryRangeV3Routes(r, am)
	api.RegisterInfraMetricsRoutes(r, am)
	api.RegisterWebSocketPaths(r, am)
	api.RegisterQueryRangeV4Routes(r, am)
	api.RegisterQueryRangeV5Routes(r, am)
	api.RegisterMessagingQueuesRoutes(r, am)
	api.RegisterThirdPartyApiRoutes(r, am)
	api.MetricExplorerRoutes(r, am)
	api.RegisterTraceFunnelsRoutes(r, am)

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
		return fmt.Errorf("constants.HTTPHostPort is required")
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
		zap.L().Info("Starting pprof server", zap.String("addr", constants.DebugHttpPort))

		err = http.ListenAndServe(constants.DebugHttpPort, nil)
		if err != nil {
			zap.L().Error("Could not start pprof server", zap.Error(err))
		}
	}()

	go func() {
		zap.L().Info("Starting OpAmp Websocket server", zap.String("addr", constants.OpAmpWsEndpoint))
		err := s.opampServer.Start(constants.OpAmpWsEndpoint)
		if err != nil {
			zap.L().Info("opamp ws server failed to start", zap.Error(err))
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
	prometheus prometheus.Prometheus,
	orgGetter organization.Getter,
	querier querier.Querier,
	logger *slog.Logger,
) (*rules.Manager, error) {
	ruleStore := sqlrulestore.NewRuleStore(sqlstore)
	maintenanceStore := sqlrulestore.NewMaintenanceStore(sqlstore)
	// create manager opts
	managerOpts := &rules.ManagerOptions{
		TelemetryStore:   telemetryStore,
		Prometheus:       prometheus,
		Context:          context.Background(),
		Logger:           zap.L(),
		Reader:           ch,
		Querier:          querier,
		SLogger:          logger,
		Cache:            cache,
		EvalDelay:        constants.GetEvalDelay(),
		OrgGetter:        orgGetter,
		Alertmanager:     alertmanager,
		RuleStore:        ruleStore,
		MaintenanceStore: maintenanceStore,
		SqlStore:         sqlstore,
	}

	// create Manager
	manager, err := rules.NewManager(managerOpts)
	if err != nil {
		return nil, fmt.Errorf("rule manager error: %v", err)
	}

	zap.L().Info("rules manager is ready")

	return manager, nil
}
