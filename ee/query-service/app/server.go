package app

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	_ "net/http/pprof" // http profiler
	"time"

	"github.com/gorilla/handlers"
	"github.com/jmoiron/sqlx"

	"github.com/rs/cors"
	"github.com/soheilhy/cmux"
	eemiddleware "go.signoz.io/signoz/ee/http/middleware"
	"go.signoz.io/signoz/ee/query-service/app/api"
	"go.signoz.io/signoz/ee/query-service/app/db"
	"go.signoz.io/signoz/ee/query-service/auth"
	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/dao"
	"go.signoz.io/signoz/ee/query-service/integrations/gateway"
	"go.signoz.io/signoz/ee/query-service/interfaces"
	"go.signoz.io/signoz/ee/query-service/rules"
	"go.signoz.io/signoz/pkg/http/middleware"
	"go.signoz.io/signoz/pkg/signoz"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"go.signoz.io/signoz/pkg/web"

	licensepkg "go.signoz.io/signoz/ee/query-service/license"
	"go.signoz.io/signoz/ee/query-service/usage"

	"go.signoz.io/signoz/pkg/query-service/agentConf"
	baseapp "go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/cloudintegrations"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	baseexplorer "go.signoz.io/signoz/pkg/query-service/app/explorer"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	opAmpModel "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.signoz.io/signoz/pkg/query-service/app/preferences"
	"go.signoz.io/signoz/pkg/query-service/cache"
	baseconst "go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/healthcheck"
	basealm "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	baseint "go.signoz.io/signoz/pkg/query-service/interfaces"
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
	pqle "go.signoz.io/signoz/pkg/query-service/pqlEngine"
	baserules "go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
)

const AppDbEngine = "sqlite"

type ServerOptions struct {
	Config            signoz.Config
	SigNoz            *signoz.SigNoz
	PromConfigPath    string
	SkipTopLvlOpsPath string
	HTTPHostPort      string
	PrivateHostPort   string
	// alert specific params
	DisableRules               bool
	RuleRepoURL                string
	PreferSpanMetrics          bool
	CacheConfigPath            string
	FluxInterval               string
	FluxIntervalForTraceDetail string
	Cluster                    string
	GatewayUrl                 string
	UseLogsNewSchema           bool
	UseTraceNewSchema          bool
	Jwt                        *authtypes.JWT
}

// Server runs HTTP api service
type Server struct {
	serverOptions *ServerOptions
	ruleManager   *baserules.Manager

	// public http router
	httpConn   net.Listener
	httpServer *http.Server

	// private http
	privateConn net.Listener
	privateHTTP *http.Server

	// Usage manager
	usageManager *usage.Manager

	opampServer *opamp.Server

	unavailableChannel chan healthcheck.Status
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

// NewServer creates and initializes Server
func NewServer(serverOptions *ServerOptions) (*Server, error) {
	modelDao, err := dao.InitDao(serverOptions.SigNoz.SQLStore)
	if err != nil {
		return nil, err
	}

	if err := baseexplorer.InitWithDSN(serverOptions.SigNoz.SQLStore.SQLxDB()); err != nil {
		return nil, err
	}

	if err := preferences.InitDB(serverOptions.SigNoz.SQLStore.SQLxDB()); err != nil {
		return nil, err
	}

	if err := dashboards.InitDB(serverOptions.SigNoz.SQLStore.SQLxDB()); err != nil {
		return nil, err
	}

	gatewayProxy, err := gateway.NewProxy(serverOptions.GatewayUrl, gateway.RoutePrefix)
	if err != nil {
		return nil, err
	}

	// initiate license manager
	lm, err := licensepkg.StartManager(serverOptions.SigNoz.SQLStore.SQLxDB(), serverOptions.SigNoz.SQLStore.BunDB())
	if err != nil {
		return nil, err
	}

	// set license manager as feature flag provider in dao
	modelDao.SetFlagProvider(lm)
	readerReady := make(chan bool)

	fluxIntervalForTraceDetail, err := time.ParseDuration(serverOptions.FluxIntervalForTraceDetail)
	if err != nil {
		return nil, err
	}

	var reader interfaces.DataConnector
	qb := db.NewDataConnector(
		serverOptions.SigNoz.SQLStore.SQLxDB(),
		serverOptions.SigNoz.TelemetryStore.ClickHouseDB(),
		serverOptions.PromConfigPath,
		lm,
		serverOptions.Cluster,
		serverOptions.UseLogsNewSchema,
		serverOptions.UseTraceNewSchema,
		fluxIntervalForTraceDetail,
		serverOptions.SigNoz.Cache,
	)
	go qb.Start(readerReady)
	reader = qb

	skipConfig := &basemodel.SkipConfig{}
	if serverOptions.SkipTopLvlOpsPath != "" {
		// read skip config
		skipConfig, err = basemodel.ReadSkipConfig(serverOptions.SkipTopLvlOpsPath)
		if err != nil {
			return nil, err
		}
	}
	var c cache.Cache
	if serverOptions.CacheConfigPath != "" {
		cacheOpts, err := cache.LoadFromYAMLCacheConfigFile(serverOptions.CacheConfigPath)
		if err != nil {
			return nil, err
		}
		c = cache.NewCache(cacheOpts)
	}

	<-readerReady
	rm, err := makeRulesManager(serverOptions.PromConfigPath,
		baseconst.GetAlertManagerApiPrefix(),
		serverOptions.RuleRepoURL,
		serverOptions.SigNoz.SQLStore.SQLxDB(),
		reader,
		c,
		serverOptions.DisableRules,
		lm,
		serverOptions.UseLogsNewSchema,
		serverOptions.UseTraceNewSchema,
	)

	if err != nil {
		return nil, err
	}

	// initiate opamp
	_, err = opAmpModel.InitDB(serverOptions.SigNoz.SQLStore.SQLxDB())
	if err != nil {
		return nil, err
	}

	integrationsController, err := integrations.NewController(serverOptions.SigNoz.SQLStore)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't create integrations controller: %w", err,
		)
	}

	cloudIntegrationsController, err := cloudintegrations.NewController(serverOptions.SigNoz.SQLStore)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't create cloud provider integrations controller: %w", err,
		)
	}

	// ingestion pipelines manager
	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		serverOptions.SigNoz.SQLStore.SQLxDB(), integrationsController.GetPipelinesForInstalledIntegrations,
	)
	if err != nil {
		return nil, err
	}

	// initiate agent config handler
	agentConfMgr, err := agentConf.Initiate(&agentConf.ManagerOptions{
		DB:            serverOptions.SigNoz.SQLStore.SQLxDB(),
		AgentFeatures: []agentConf.AgentFeature{logParsingPipelineController},
	})
	if err != nil {
		return nil, err
	}

	// start the usagemanager
	usageManager, err := usage.New(modelDao, lm.GetRepo(), serverOptions.SigNoz.TelemetryStore.ClickHouseDB(), serverOptions.Config.TelemetryStore.ClickHouse.DSN)
	if err != nil {
		return nil, err
	}
	err = usageManager.Start()
	if err != nil {
		return nil, err
	}

	telemetry.GetInstance().SetReader(reader)
	telemetry.GetInstance().SetSaasOperator(constants.SaasSegmentKey)

	fluxInterval, err := time.ParseDuration(serverOptions.FluxInterval)
	if err != nil {
		return nil, err
	}

	apiOpts := api.APIHandlerOptions{
		DataConnector:                 reader,
		SkipConfig:                    skipConfig,
		PreferSpanMetrics:             serverOptions.PreferSpanMetrics,
		AppDao:                        modelDao,
		RulesManager:                  rm,
		UsageManager:                  usageManager,
		FeatureFlags:                  lm,
		LicenseManager:                lm,
		IntegrationsController:        integrationsController,
		CloudIntegrationsController:   cloudIntegrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		Cache:                         c,
		FluxInterval:                  fluxInterval,
		Gateway:                       gatewayProxy,
		GatewayUrl:                    serverOptions.GatewayUrl,
		UseLogsNewSchema:              serverOptions.UseLogsNewSchema,
		UseTraceNewSchema:             serverOptions.UseTraceNewSchema,
		JWT:                           serverOptions.Jwt,
	}

	apiHandler, err := api.NewAPIHandler(apiOpts)
	if err != nil {
		return nil, err
	}

	s := &Server{
		// logger: logger,
		// tracer: tracer,
		ruleManager:        rm,
		serverOptions:      serverOptions,
		unavailableChannel: make(chan healthcheck.Status),
		usageManager:       usageManager,
	}

	httpServer, err := s.createPublicServer(apiHandler, serverOptions.SigNoz.Web)

	if err != nil {
		return nil, err
	}

	s.httpServer = httpServer

	privateServer, err := s.createPrivateServer(apiHandler)
	if err != nil {
		return nil, err
	}

	s.privateHTTP = privateServer

	s.opampServer = opamp.InitializeServer(
		&opAmpModel.AllAgents, agentConfMgr,
	)

	return s, nil
}

func (s *Server) createPrivateServer(apiHandler *api.APIHandler) (*http.Server, error) {

	r := baseapp.NewRouter()

	r.Use(middleware.NewAuth(zap.L(), s.serverOptions.Jwt, []string{"Authorization", "Sec-WebSocket-Protocol"}).Wrap)
	r.Use(eemiddleware.NewPat([]string{"SIGNOZ-API-KEY"}).Wrap)
	r.Use(middleware.NewTimeout(zap.L(),
		s.serverOptions.Config.APIServer.Timeout.ExcludedRoutes,
		s.serverOptions.Config.APIServer.Timeout.Default,
		s.serverOptions.Config.APIServer.Timeout.Max,
	).Wrap)
	r.Use(middleware.NewAnalytics(zap.L()).Wrap)
	r.Use(middleware.NewLogging(zap.L(), s.serverOptions.Config.APIServer.Logging.ExcludedRoutes).Wrap)

	apiHandler.RegisterPrivateRoutes(r)

	c := cors.New(cors.Options{
		//todo(amol): find out a way to add exact domain or
		// ip here for alert manager
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "SIGNOZ-API-KEY", "X-SIGNOZ-QUERY-ID", "Sec-WebSocket-Protocol"},
	})

	handler := c.Handler(r)
	handler = handlers.CompressHandler(handler)

	return &http.Server{
		Handler: handler,
	}, nil
}

func (s *Server) createPublicServer(apiHandler *api.APIHandler, web web.Web) (*http.Server, error) {

	r := baseapp.NewRouter()

	// add auth middleware
	getUserFromRequest := func(ctx context.Context) (*basemodel.UserPayload, error) {
		user, err := auth.GetUserFromRequestContext(ctx, apiHandler)

		if err != nil {
			return nil, err
		}

		if user.User.OrgId == "" {
			return nil, basemodel.UnauthorizedError(errors.New("orgId is missing in the claims"))
		}

		return user, nil
	}
	am := baseapp.NewAuthMiddleware(getUserFromRequest)

	r.Use(middleware.NewAuth(zap.L(), s.serverOptions.Jwt, []string{"Authorization", "Sec-WebSocket-Protocol"}).Wrap)
	r.Use(eemiddleware.NewPat([]string{"SIGNOZ-API-KEY"}).Wrap)
	r.Use(middleware.NewTimeout(zap.L(),
		s.serverOptions.Config.APIServer.Timeout.ExcludedRoutes,
		s.serverOptions.Config.APIServer.Timeout.Default,
		s.serverOptions.Config.APIServer.Timeout.Max,
	).Wrap)
	r.Use(middleware.NewAnalytics(zap.L()).Wrap)
	r.Use(middleware.NewLogging(zap.L(), s.serverOptions.Config.APIServer.Logging.ExcludedRoutes).Wrap)

	apiHandler.RegisterRoutes(r, am)
	apiHandler.RegisterLogsRoutes(r, am)
	apiHandler.RegisterIntegrationRoutes(r, am)
	apiHandler.RegisterCloudIntegrationsRoutes(r, am)
	apiHandler.RegisterQueryRangeV3Routes(r, am)
	apiHandler.RegisterInfraMetricsRoutes(r, am)
	apiHandler.RegisterQueryRangeV4Routes(r, am)
	apiHandler.RegisterWebSocketPaths(r, am)
	apiHandler.RegisterMessagingQueuesRoutes(r, am)

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
	publicHostPort := s.serverOptions.HTTPHostPort
	if publicHostPort == "" {
		return fmt.Errorf("baseconst.HTTPHostPort is required")
	}

	s.httpConn, err = net.Listen("tcp", publicHostPort)
	if err != nil {
		return err
	}

	zap.L().Info(fmt.Sprintf("Query server started listening on %s...", s.serverOptions.HTTPHostPort))

	// listen on private port to support internal services
	privateHostPort := s.serverOptions.PrivateHostPort

	if privateHostPort == "" {
		return fmt.Errorf("baseconst.PrivateHostPort is required")
	}

	s.privateConn, err = net.Listen("tcp", privateHostPort)
	if err != nil {
		return err
	}
	zap.L().Info(fmt.Sprintf("Query server started listening on private port %s...", s.serverOptions.PrivateHostPort))

	return nil
}

// Start listening on http and private http port concurrently
func (s *Server) Start() error {

	// initiate rule manager first
	if !s.serverOptions.DisableRules {
		s.ruleManager.Start()
	} else {
		zap.L().Info("msg: Rules disabled as rules.disable is set to TRUE")
	}

	err := s.initListeners()
	if err != nil {
		return err
	}

	var httpPort int
	if port, err := utils.GetPort(s.httpConn.Addr()); err == nil {
		httpPort = port
	}

	go func() {
		zap.L().Info("Starting HTTP server", zap.Int("port", httpPort), zap.String("addr", s.serverOptions.HTTPHostPort))

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

	var privatePort int
	if port, err := utils.GetPort(s.privateConn.Addr()); err == nil {
		privatePort = port
	}

	go func() {
		zap.L().Info("Starting Private HTTP server", zap.Int("port", privatePort), zap.String("addr", s.serverOptions.PrivateHostPort))

		switch err := s.privateHTTP.Serve(s.privateConn); err {
		case nil, http.ErrServerClosed, cmux.ErrListenerClosed:
			// normal exit, nothing to do
			zap.L().Info("private http server closed")
		default:
			zap.L().Error("Could not start private HTTP server", zap.Error(err))
		}

		s.unavailableChannel <- healthcheck.Unavailable

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

func (s *Server) Stop() error {
	if s.httpServer != nil {
		if err := s.httpServer.Shutdown(context.Background()); err != nil {
			return err
		}
	}

	if s.privateHTTP != nil {
		if err := s.privateHTTP.Shutdown(context.Background()); err != nil {
			return err
		}
	}

	s.opampServer.Stop()

	if s.ruleManager != nil {
		s.ruleManager.Stop()
	}

	// stop usage manager
	s.usageManager.Stop()

	return nil
}

func makeRulesManager(
	promConfigPath,
	alertManagerURL string,
	ruleRepoURL string,
	db *sqlx.DB,
	ch baseint.Reader,
	cache cache.Cache,
	disableRules bool,
	fm baseint.FeatureLookup,
	useLogsNewSchema bool,
	useTraceNewSchema bool) (*baserules.Manager, error) {

	// create engine
	pqle, err := pqle.FromConfigPath(promConfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create pql engine : %v", err)
	}

	// notifier opts
	notifierOpts := basealm.NotifierOptions{
		QueueCapacity:    10000,
		Timeout:          1 * time.Second,
		AlertManagerURLs: []string{alertManagerURL},
	}

	// create manager opts
	managerOpts := &baserules.ManagerOptions{
		NotifierOpts: notifierOpts,
		PqlEngine:    pqle,
		RepoURL:      ruleRepoURL,
		DBConn:       db,
		Context:      context.Background(),
		Logger:       zap.L(),
		DisableRules: disableRules,
		FeatureFlags: fm,
		Reader:       ch,
		Cache:        cache,
		EvalDelay:    baseconst.GetEvalDelay(),

		PrepareTaskFunc:     rules.PrepareTaskFunc,
		UseLogsNewSchema:    useLogsNewSchema,
		UseTraceNewSchema:   useTraceNewSchema,
		PrepareTestRuleFunc: rules.TestNotification,
	}

	// create Manager
	manager, err := baserules.NewManager(managerOpts)
	if err != nil {
		return nil, fmt.Errorf("rule manager error: %v", err)
	}

	zap.L().Info("rules manager is ready")

	return manager, nil
}
