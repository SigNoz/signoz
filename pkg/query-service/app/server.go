package app

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	_ "net/http/pprof" // http profiler
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/jmoiron/sqlx"

	"github.com/rs/cors"
	"github.com/soheilhy/cmux"
	"go.signoz.io/signoz/pkg/http/middleware"
	"go.signoz.io/signoz/pkg/query-service/agentConf"
	"go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	"go.signoz.io/signoz/pkg/query-service/app/cloudintegrations"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/app/integrations"
	"go.signoz.io/signoz/pkg/query-service/app/logparsingpipeline"
	"go.signoz.io/signoz/pkg/query-service/app/opamp"
	opAmpModel "go.signoz.io/signoz/pkg/query-service/app/opamp/model"
	"go.signoz.io/signoz/pkg/query-service/app/preferences"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/signoz"
	"go.signoz.io/signoz/pkg/web"

	"go.signoz.io/signoz/pkg/query-service/app/explorer"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/featureManager"
	"go.signoz.io/signoz/pkg/query-service/healthcheck"
	am "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	pqle "go.signoz.io/signoz/pkg/query-service/pqlEngine"
	"go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
)

type ServerOptions struct {
	PromConfigPath    string
	SkipTopLvlOpsPath string
	HTTPHostPort      string
	PrivateHostPort   string
	// alert specific params
	DisableRules      bool
	RuleRepoURL       string
	PreferSpanMetrics bool
	MaxIdleConns      int
	MaxOpenConns      int
	DialTimeout       time.Duration
	CacheConfigPath   string
	FluxInterval      string
	Cluster           string
	UseLogsNewSchema  bool
	UseTraceNewSchema bool
	SigNoz            *signoz.SigNoz
}

// Server runs HTTP, Mux and a grpc server
type Server struct {
	serverOptions *ServerOptions
	ruleManager   *rules.Manager

	// public http router
	httpConn   net.Listener
	httpServer *http.Server

	// private http
	privateConn net.Listener
	privateHTTP *http.Server

	opampServer *opamp.Server

	unavailableChannel chan healthcheck.Status
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

// NewServer creates and initializes Server
func NewServer(serverOptions *ServerOptions) (*Server, error) {
	var err error
	if err := dao.InitDao(serverOptions.SigNoz.SQLStore.SQLxDB()); err != nil {
		return nil, err
	}

	if err := preferences.InitDB(serverOptions.SigNoz.SQLStore.SQLxDB()); err != nil {
		return nil, err
	}

	if err := dashboards.InitDB(serverOptions.SigNoz.SQLStore.SQLxDB()); err != nil {
		return nil, err
	}

	if err := explorer.InitWithDSN(serverOptions.SigNoz.SQLStore.SQLxDB()); err != nil {
		return nil, err
	}

	// initiate feature manager
	fm := featureManager.StartManager()

	readerReady := make(chan bool)

	var reader interfaces.Reader
	storage := os.Getenv("STORAGE")
	if storage == "clickhouse" {
		zap.L().Info("Using ClickHouse as datastore ...")
		clickhouseReader := clickhouseReader.NewReader(
			serverOptions.SigNoz.SQLStore.SQLxDB(),
			serverOptions.PromConfigPath,
			fm,
			serverOptions.MaxIdleConns,
			serverOptions.MaxOpenConns,
			serverOptions.DialTimeout,
			serverOptions.Cluster,
			serverOptions.UseLogsNewSchema,
			serverOptions.UseTraceNewSchema,
		)
		go clickhouseReader.Start(readerReady)
		reader = clickhouseReader
	} else {
		return nil, fmt.Errorf("storage type: %s is not supported in query service", storage)
	}
	skipConfig := &model.SkipConfig{}
	if serverOptions.SkipTopLvlOpsPath != "" {
		// read skip config
		skipConfig, err = model.ReadSkipConfig(serverOptions.SkipTopLvlOpsPath)
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
	rm, err := makeRulesManager(
		serverOptions.PromConfigPath,
		constants.GetAlertManagerApiPrefix(),
		serverOptions.RuleRepoURL, serverOptions.SigNoz.SQLStore.SQLxDB(), reader, c, serverOptions.DisableRules, fm, serverOptions.UseLogsNewSchema, serverOptions.UseTraceNewSchema)
	if err != nil {
		return nil, err
	}

	fluxInterval, err := time.ParseDuration(serverOptions.FluxInterval)
	if err != nil {
		return nil, err
	}

	integrationsController, err := integrations.NewController(serverOptions.SigNoz.SQLStore.SQLxDB())
	if err != nil {
		return nil, fmt.Errorf("couldn't create integrations controller: %w", err)
	}

	cloudIntegrationsController, err := cloudintegrations.NewController(serverOptions.SigNoz.SQLStore.SQLxDB())
	if err != nil {
		return nil, fmt.Errorf("couldn't create cloud provider integrations controller: %w", err)
	}

	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		serverOptions.SigNoz.SQLStore.SQLxDB(), integrationsController.GetPipelinesForInstalledIntegrations,
	)
	if err != nil {
		return nil, err
	}

	telemetry.GetInstance().SetReader(reader)
	apiHandler, err := NewAPIHandler(APIHandlerOpts{
		Reader:                        reader,
		SkipConfig:                    skipConfig,
		PreferSpanMetrics:             serverOptions.PreferSpanMetrics,
		MaxIdleConns:                  serverOptions.MaxIdleConns,
		MaxOpenConns:                  serverOptions.MaxOpenConns,
		DialTimeout:                   serverOptions.DialTimeout,
		AppDao:                        dao.DB(),
		RuleManager:                   rm,
		FeatureFlags:                  fm,
		IntegrationsController:        integrationsController,
		CloudIntegrationsController:   cloudIntegrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		Cache:                         c,
		FluxInterval:                  fluxInterval,
		UseLogsNewSchema:              serverOptions.UseLogsNewSchema,
		UseTraceNewSchema:             serverOptions.UseTraceNewSchema,
	})
	if err != nil {
		return nil, err
	}

	s := &Server{
		// logger: logger,
		// tracer: tracer,
		ruleManager:        rm,
		serverOptions:      serverOptions,
		unavailableChannel: make(chan healthcheck.Status),
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

	_, err = opAmpModel.InitDB(serverOptions.SigNoz.SQLStore.SQLxDB())
	if err != nil {
		return nil, err
	}

	agentConfMgr, err := agentConf.Initiate(&agentConf.ManagerOptions{
		DB: serverOptions.SigNoz.SQLStore.SQLxDB(),
		AgentFeatures: []agentConf.AgentFeature{
			logParsingPipelineController,
		},
	})
	if err != nil {
		return nil, err
	}

	s.opampServer = opamp.InitializeServer(
		&opAmpModel.AllAgents, agentConfMgr,
	)

	return s, nil
}

func (s *Server) createPrivateServer(api *APIHandler) (*http.Server, error) {

	r := NewRouter()

	r.Use(setTimeoutMiddleware)
	r.Use(middleware.NewAnalyticsMiddleware().Wrap)
	r.Use(middleware.NewLogging(zap.L()).Wrap)

	api.RegisterPrivateRoutes(r)

	c := cors.New(cors.Options{
		//todo(amol): find out a way to add exact domain or
		// ip here for alert manager
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-SIGNOZ-QUERY-ID", "Sec-WebSocket-Protocol"},
	})

	handler := c.Handler(r)
	handler = handlers.CompressHandler(handler)

	return &http.Server{
		Handler: handler,
	}, nil
}

func (s *Server) createPublicServer(api *APIHandler, web web.Web) (*http.Server, error) {

	r := NewRouter()

	r.Use(setTimeoutMiddleware)
	r.Use(middleware.NewAnalyticsMiddleware().Wrap)
	r.Use(middleware.NewLogging(zap.L()).Wrap)
	r.Use(LogCommentEnricher)

	// add auth middleware
	getUserFromRequest := func(r *http.Request) (*model.UserPayload, error) {
		user, err := auth.GetUserFromRequest(r)

		if err != nil {
			return nil, err
		}

		if user.User.OrgId == "" {
			return nil, model.UnauthorizedError(errors.New("orgId is missing in the claims"))
		}

		return user, nil
	}
	am := NewAuthMiddleware(getUserFromRequest)

	api.RegisterRoutes(r, am)
	api.RegisterLogsRoutes(r, am)
	api.RegisterIntegrationRoutes(r, am)
	api.RegisterCloudIntegrationsRoutes(r, am)
	api.RegisterQueryRangeV3Routes(r, am)
	api.RegisterInfraMetricsRoutes(r, am)
	api.RegisterWebSocketPaths(r, am)
	api.RegisterQueryRangeV4Routes(r, am)
	api.RegisterMessagingQueuesRoutes(r, am)

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

func LogCommentEnricher(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		referrer := r.Header.Get("Referer")

		var path, dashboardID, alertID, page, client, viewName, tab string

		if referrer != "" {
			referrerURL, _ := url.Parse(referrer)
			client = "browser"
			path = referrerURL.Path

			if strings.Contains(path, "/dashboard") {
				// Split the path into segments
				pathSegments := strings.Split(referrerURL.Path, "/")
				// The dashboard ID should be the segment after "/dashboard/"
				// Loop through pathSegments to find "dashboard" and then take the next segment as the ID
				for i, segment := range pathSegments {
					if segment == "dashboard" && i < len(pathSegments)-1 {
						// Return the next segment, which should be the dashboard ID
						dashboardID = pathSegments[i+1]
					}
				}
				page = "dashboards"
			} else if strings.Contains(path, "/alerts") {
				urlParams := referrerURL.Query()
				alertID = urlParams.Get("ruleId")
				page = "alerts"
			} else if strings.Contains(path, "logs") && strings.Contains(path, "explorer") {
				page = "logs-explorer"
				viewName = referrerURL.Query().Get("viewName")
			} else if strings.Contains(path, "/trace") || strings.Contains(path, "traces-explorer") {
				page = "traces-explorer"
				viewName = referrerURL.Query().Get("viewName")
			} else if strings.Contains(path, "/services") {
				page = "services"
				tab = referrerURL.Query().Get("tab")
				if tab == "" {
					tab = "OVER_METRICS"
				}
			}
		} else {
			client = "api"
		}

		email, _ := auth.GetEmailFromJwt(r.Context())

		kvs := map[string]string{
			"path":        path,
			"dashboardID": dashboardID,
			"alertID":     alertID,
			"source":      page,
			"client":      client,
			"viewName":    viewName,
			"servicesTab": tab,
			"email":       email,
		}

		r = r.WithContext(context.WithValue(r.Context(), common.LogCommentKey, kvs))
		next.ServeHTTP(w, r)
	})
}

// TODO(remove): Implemented at pkg/http/middleware/timeout.go
func getRouteContextTimeout(overrideTimeout string) time.Duration {
	var timeout time.Duration
	var err error
	if overrideTimeout != "" {
		timeout, err = time.ParseDuration(overrideTimeout + "s")
		if err != nil {
			timeout = constants.ContextTimeout
		}
		if timeout > constants.ContextTimeoutMaxAllowed {
			timeout = constants.ContextTimeoutMaxAllowed
		}
		return timeout
	}
	return constants.ContextTimeout
}

// TODO(remove): Implemented at pkg/http/middleware/timeout.go
func setTimeoutMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var cancel context.CancelFunc
		// check if route is not excluded
		url := r.URL.Path
		if _, ok := constants.TimeoutExcludedRoutes[url]; !ok {
			ctx, cancel = context.WithTimeout(r.Context(), getRouteContextTimeout(r.Header.Get("timeout")))
			defer cancel()
		}

		r = r.WithContext(ctx)
		next.ServeHTTP(w, r)
	})
}

// initListeners initialises listeners of the server
func (s *Server) initListeners() error {
	// listen on public port
	var err error
	publicHostPort := s.serverOptions.HTTPHostPort
	if publicHostPort == "" {
		return fmt.Errorf("constants.HTTPHostPort is required")
	}

	s.httpConn, err = net.Listen("tcp", publicHostPort)
	if err != nil {
		return err
	}

	zap.L().Info(fmt.Sprintf("Query server started listening on %s...", s.serverOptions.HTTPHostPort))

	// listen on private port to support internal services
	privateHostPort := s.serverOptions.PrivateHostPort

	if privateHostPort == "" {
		return fmt.Errorf("constants.PrivateHostPort is required")
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
		zap.L().Info("Starting pprof server", zap.String("addr", constants.DebugHttpPort))

		err = http.ListenAndServe(constants.DebugHttpPort, nil)
		if err != nil {
			zap.L().Error("Could not start pprof server", zap.Error(err))
		}
	}()

	var privatePort int
	if port, err := utils.GetPort(s.privateConn.Addr()); err == nil {
		privatePort = port
	}
	fmt.Println("starting private http")
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
		zap.L().Info("Starting OpAmp Websocket server", zap.String("addr", constants.OpAmpWsEndpoint))
		err := s.opampServer.Start(constants.OpAmpWsEndpoint)
		if err != nil {
			zap.L().Info("opamp ws server failed to start", zap.Error(err))
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

	return nil
}

func makeRulesManager(
	_,
	alertManagerURL string,
	ruleRepoURL string,
	db *sqlx.DB,
	ch interfaces.Reader,
	cache cache.Cache,
	disableRules bool,
	fm interfaces.FeatureLookup,
	useLogsNewSchema bool,
	useTraceNewSchema bool) (*rules.Manager, error) {

	// create engine
	pqle, err := pqle.FromReader(ch)
	if err != nil {
		return nil, fmt.Errorf("failed to create pql engine : %v", err)
	}

	// notifier opts
	notifierOpts := am.NotifierOptions{
		QueueCapacity:    10000,
		Timeout:          1 * time.Second,
		AlertManagerURLs: []string{alertManagerURL},
	}

	// create manager opts
	managerOpts := &rules.ManagerOptions{
		NotifierOpts:      notifierOpts,
		PqlEngine:         pqle,
		RepoURL:           ruleRepoURL,
		DBConn:            db,
		Context:           context.Background(),
		Logger:            zap.L(),
		DisableRules:      disableRules,
		FeatureFlags:      fm,
		Reader:            ch,
		Cache:             cache,
		EvalDelay:         constants.GetEvalDelay(),
		UseLogsNewSchema:  useLogsNewSchema,
		UseTraceNewSchema: useTraceNewSchema,
	}

	// create Manager
	manager, err := rules.NewManager(managerOpts)
	if err != nil {
		return nil, fmt.Errorf("rule manager error: %v", err)
	}

	zap.L().Info("rules manager is ready")

	return manager, nil
}
