package app

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	_ "net/http/pprof" // http profiler
	"os"
	"regexp"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"

	"github.com/rs/cors"
	"github.com/soheilhy/cmux"
	"go.signoz.io/signoz/ee/query-service/app/api"
	"go.signoz.io/signoz/ee/query-service/app/db"
	"go.signoz.io/signoz/ee/query-service/auth"
	"go.signoz.io/signoz/ee/query-service/constants"
	"go.signoz.io/signoz/ee/query-service/dao"
	"go.signoz.io/signoz/ee/query-service/integrations/gateway"
	"go.signoz.io/signoz/ee/query-service/interfaces"
	"go.signoz.io/signoz/ee/query-service/rules"
	baseauth "go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/migrate"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

	licensepkg "go.signoz.io/signoz/ee/query-service/license"
	"go.signoz.io/signoz/ee/query-service/usage"

	"go.signoz.io/signoz/pkg/query-service/agentConf"
	baseapp "go.signoz.io/signoz/pkg/query-service/app"
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
	GatewayUrl        string
	UseLogsNewSchema  bool
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

	modelDao, err := dao.InitDao("sqlite", baseconst.RELATIONAL_DATASOURCE_PATH)
	if err != nil {
		return nil, err
	}

	baseexplorer.InitWithDSN(baseconst.RELATIONAL_DATASOURCE_PATH)

	if err := preferences.InitDB(baseconst.RELATIONAL_DATASOURCE_PATH); err != nil {
		return nil, err
	}

	localDB, err := dashboards.InitDB(baseconst.RELATIONAL_DATASOURCE_PATH)

	if err != nil {
		return nil, err
	}

	localDB.SetMaxOpenConns(10)

	gatewayProxy, err := gateway.NewProxy(serverOptions.GatewayUrl, gateway.RoutePrefix)
	if err != nil {
		return nil, err
	}

	// initiate license manager
	lm, err := licensepkg.StartManager("sqlite", localDB)
	if err != nil {
		return nil, err
	}

	// set license manager as feature flag provider in dao
	modelDao.SetFlagProvider(lm)
	readerReady := make(chan bool)

	var reader interfaces.DataConnector
	storage := os.Getenv("STORAGE")
	if storage == "clickhouse" {
		zap.L().Info("Using ClickHouse as datastore ...")
		qb := db.NewDataConnector(
			localDB,
			serverOptions.PromConfigPath,
			lm,
			serverOptions.MaxIdleConns,
			serverOptions.MaxOpenConns,
			serverOptions.DialTimeout,
			serverOptions.Cluster,
			serverOptions.UseLogsNewSchema,
		)
		go qb.Start(readerReady)
		reader = qb
	} else {
		return nil, fmt.Errorf("storage type: %s is not supported in query service", storage)
	}
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
		localDB,
		reader,
		c,
		serverOptions.DisableRules,
		lm,
		serverOptions.UseLogsNewSchema,
	)

	if err != nil {
		return nil, err
	}

	go func() {
		err = migrate.ClickHouseMigrate(reader.GetConn(), serverOptions.Cluster)
		if err != nil {
			zap.L().Error("error while running clickhouse migrations", zap.Error(err))
		}
	}()

	// initiate opamp
	_, err = opAmpModel.InitDB(localDB)
	if err != nil {
		return nil, err
	}

	integrationsController, err := integrations.NewController(localDB)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't create integrations controller: %w", err,
		)
	}

	// ingestion pipelines manager
	logParsingPipelineController, err := logparsingpipeline.NewLogParsingPipelinesController(
		localDB, "sqlite", integrationsController.GetPipelinesForInstalledIntegrations,
	)
	if err != nil {
		return nil, err
	}

	// initiate agent config handler
	agentConfMgr, err := agentConf.Initiate(&agentConf.ManagerOptions{
		DB:            localDB,
		DBEngine:      AppDbEngine,
		AgentFeatures: []agentConf.AgentFeature{logParsingPipelineController},
	})
	if err != nil {
		return nil, err
	}

	// start the usagemanager
	usageManager, err := usage.New("sqlite", modelDao, lm.GetRepo(), reader.GetConn())
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
		MaxIdleConns:                  serverOptions.MaxIdleConns,
		MaxOpenConns:                  serverOptions.MaxOpenConns,
		DialTimeout:                   serverOptions.DialTimeout,
		AppDao:                        modelDao,
		RulesManager:                  rm,
		UsageManager:                  usageManager,
		FeatureFlags:                  lm,
		LicenseManager:                lm,
		IntegrationsController:        integrationsController,
		LogsParsingPipelineController: logParsingPipelineController,
		Cache:                         c,
		FluxInterval:                  fluxInterval,
		Gateway:                       gatewayProxy,
		UseLogsNewSchema:              serverOptions.UseLogsNewSchema,
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

	httpServer, err := s.createPublicServer(apiHandler)

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

	r.Use(baseapp.LogCommentEnricher)
	r.Use(setTimeoutMiddleware)
	r.Use(s.analyticsMiddleware)
	r.Use(loggingMiddlewarePrivate)

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

func (s *Server) createPublicServer(apiHandler *api.APIHandler) (*http.Server, error) {

	r := baseapp.NewRouter()

	// add auth middleware
	getUserFromRequest := func(r *http.Request) (*basemodel.UserPayload, error) {
		user, err := auth.GetUserFromRequest(r, apiHandler)

		if err != nil {
			return nil, err
		}

		if user.User.OrgId == "" {
			return nil, model.UnauthorizedError(errors.New("orgId is missing in the claims"))
		}

		return user, nil
	}
	am := baseapp.NewAuthMiddleware(getUserFromRequest)

	r.Use(baseapp.LogCommentEnricher)
	r.Use(setTimeoutMiddleware)
	r.Use(s.analyticsMiddleware)
	r.Use(loggingMiddleware)

	apiHandler.RegisterRoutes(r, am)
	apiHandler.RegisterLogsRoutes(r, am)
	apiHandler.RegisterIntegrationRoutes(r, am)
	apiHandler.RegisterQueryRangeV3Routes(r, am)
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

	return &http.Server{
		Handler: handler,
	}, nil
}

// TODO(remove): Implemented at pkg/http/middleware/logging.go
// loggingMiddleware is used for logging public api calls
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()
		startTime := time.Now()
		next.ServeHTTP(w, r)
		zap.L().Info(path, zap.Duration("timeTaken", time.Since(startTime)), zap.String("path", path))
	})
}

// TODO(remove): Implemented at pkg/http/middleware/logging.go
// loggingMiddlewarePrivate is used for logging private api calls
// from internal services like alert manager
func loggingMiddlewarePrivate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()
		startTime := time.Now()
		next.ServeHTTP(w, r)
		zap.L().Info(path, zap.Duration("timeTaken", time.Since(startTime)), zap.String("path", path), zap.Bool("tprivatePort", true))
	})
}

// TODO(remove): Implemented at pkg/http/middleware/logging.go
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

// TODO(remove): Implemented at pkg/http/middleware/logging.go
func NewLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	// WriteHeader(int) is not called if our response implicitly returns 200 OK, so
	// we default to that status code.
	return &loggingResponseWriter{w, http.StatusOK}
}

// TODO(remove): Implemented at pkg/http/middleware/logging.go
func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// TODO(remove): Implemented at pkg/http/middleware/logging.go
// Flush implements the http.Flush interface.
func (lrw *loggingResponseWriter) Flush() {
	lrw.ResponseWriter.(http.Flusher).Flush()
}

// TODO(remove): Implemented at pkg/http/middleware/logging.go
// Support websockets
func (lrw *loggingResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := lrw.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("hijack not supported")
	}
	return h.Hijack()
}

func extractQueryRangeData(path string, r *http.Request) (map[string]interface{}, bool) {
	pathToExtractBodyFromV3 := "/api/v3/query_range"
	pathToExtractBodyFromV4 := "/api/v4/query_range"

	data := map[string]interface{}{}
	var postData *v3.QueryRangeParamsV3

	if (r.Method == "POST") && ((path == pathToExtractBodyFromV3) || (path == pathToExtractBodyFromV4)) {
		if r.Body != nil {
			bodyBytes, err := io.ReadAll(r.Body)
			if err != nil {
				return nil, false
			}
			r.Body.Close() //  must close
			r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			json.Unmarshal(bodyBytes, &postData)

		} else {
			return nil, false
		}

	} else {
		return nil, false
	}

	referrer := r.Header.Get("Referer")

	dashboardMatched, err := regexp.MatchString(`/dashboard/[a-zA-Z0-9\-]+/(new|edit)(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the referrer", zap.Error(err))
	}
	alertMatched, err := regexp.MatchString(`/alerts/(new|edit)(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the alert: ", zap.Error(err))
	}
	logsExplorerMatched, err := regexp.MatchString(`/logs/logs-explorer(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the logs explorer: ", zap.Error(err))
	}
	traceExplorerMatched, err := regexp.MatchString(`/traces-explorer(?:\?.*)?$`, referrer)
	if err != nil {
		zap.L().Error("error while matching the trace explorer: ", zap.Error(err))
	}

	signozMetricsUsed := false
	signozLogsUsed := false
	signozTracesUsed := false
	if postData != nil {

		if postData.CompositeQuery != nil {
			data["queryType"] = postData.CompositeQuery.QueryType
			data["panelType"] = postData.CompositeQuery.PanelType

			signozLogsUsed, signozMetricsUsed, signozTracesUsed = telemetry.GetInstance().CheckSigNozSignals(postData)
		}
	}

	if signozMetricsUsed || signozLogsUsed || signozTracesUsed {
		if signozMetricsUsed {
			telemetry.GetInstance().AddActiveMetricsUser()
		}
		if signozLogsUsed {
			telemetry.GetInstance().AddActiveLogsUser()
		}
		if signozTracesUsed {
			telemetry.GetInstance().AddActiveTracesUser()
		}
		data["metricsUsed"] = signozMetricsUsed
		data["logsUsed"] = signozLogsUsed
		data["tracesUsed"] = signozTracesUsed
		userEmail, err := baseauth.GetEmailFromJwt(r.Context())
		if err == nil {
			// switch case to set data["screen"] based on the referrer
			switch {
			case dashboardMatched:
				data["screen"] = "panel"
			case alertMatched:
				data["screen"] = "alert"
			case logsExplorerMatched:
				data["screen"] = "logs-explorer"
			case traceExplorerMatched:
				data["screen"] = "traces-explorer"
			default:
				data["screen"] = "unknown"
				return data, true
			}
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_QUERY_RANGE_API, data, userEmail, true, false)
		}
	}
	return data, true
}

func getActiveLogs(path string, r *http.Request) {
	// if path == "/api/v1/dashboards/{uuid}" {
	// 	telemetry.GetInstance().AddActiveMetricsUser()
	// }
	if path == "/api/v1/logs" {
		hasFilters := len(r.URL.Query().Get("q"))
		if hasFilters > 0 {
			telemetry.GetInstance().AddActiveLogsUser()
		}

	}

}

func (s *Server) analyticsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := baseauth.AttachJwtToContext(r.Context(), r)
		r = r.WithContext(ctx)
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()

		queryRangeData, metadataExists := extractQueryRangeData(path, r)
		getActiveLogs(path, r)

		lrw := NewLoggingResponseWriter(w)
		next.ServeHTTP(lrw, r)

		data := map[string]interface{}{"path": path, "statusCode": lrw.statusCode}
		if metadataExists {
			for key, value := range queryRangeData {
				data[key] = value
			}
		}

		if _, ok := telemetry.EnabledPaths()[path]; ok {
			userEmail, err := baseauth.GetEmailFromJwt(r.Context())
			if err == nil {
				telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_PATH, data, userEmail, true, false)
			}
		}

	})
}

// TODO(remove): Implemented at pkg/http/middleware/timeout.go
func setTimeoutMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var cancel context.CancelFunc
		// check if route is not excluded
		url := r.URL.Path
		if _, ok := baseconst.TimeoutExcludedRoutes[url]; !ok {
			ctx, cancel = context.WithTimeout(r.Context(), baseconst.ContextTimeout)
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
	useLogsNewSchema bool) (*baserules.Manager, error) {

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

		PrepareTaskFunc:  rules.PrepareTaskFunc,
		UseLogsNewSchema: useLogsNewSchema,
	}

	// create Manager
	manager, err := baserules.NewManager(managerOpts)
	if err != nil {
		return nil, fmt.Errorf("rule manager error: %v", err)
	}

	zap.L().Info("rules manager is ready")

	return manager, nil
}
