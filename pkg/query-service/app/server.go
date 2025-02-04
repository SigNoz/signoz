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
	"regexp"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
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
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
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
	Config            signoz.Config
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
	UseLogsNewSchema           bool
	UseTraceNewSchema          bool
	SigNoz                     *signoz.SigNoz
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

	fluxIntervalForTraceDetail, err := time.ParseDuration(serverOptions.FluxIntervalForTraceDetail)
	if err != nil {
		return nil, err
	}

	clickhouseReader := clickhouseReader.NewReader(
		serverOptions.SigNoz.SQLStore.SQLxDB(),
		serverOptions.SigNoz.TelemetryStore.ClickHouseDB(),
		serverOptions.PromConfigPath,
		fm,
		serverOptions.Cluster,
		serverOptions.UseLogsNewSchema,
		serverOptions.UseTraceNewSchema,
		fluxIntervalForTraceDetail,
		serverOptions.SigNoz.Cache,
	)
	go clickhouseReader.Start(readerReady)
	reader := clickhouseReader

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

	r.Use(middleware.NewTimeout(zap.L(),
		s.serverOptions.Config.APIServer.Timeout.ExcludedRoutes,
		s.serverOptions.Config.APIServer.Timeout.Default,
		s.serverOptions.Config.APIServer.Timeout.Max,
	).Wrap)
	r.Use(middleware.NewAnalytics(zap.L()).Wrap)
	r.Use(middleware.NewLogging(zap.L(), s.serverOptions.Config.APIServer.Logging.ExcludedRoutes).Wrap)

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

	r.Use(middleware.NewTimeout(zap.L(),
		s.serverOptions.Config.APIServer.Timeout.ExcludedRoutes,
		s.serverOptions.Config.APIServer.Timeout.Default,
		s.serverOptions.Config.APIServer.Timeout.Max,
	).Wrap)
	r.Use(middleware.NewAnalytics(zap.L()).Wrap)
	r.Use(middleware.NewLogging(zap.L(), s.serverOptions.Config.APIServer.Logging.ExcludedRoutes).Wrap)

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

func extractQueryRangeV3Data(path string, r *http.Request) (map[string]interface{}, bool) {
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

	queryInfoResult := telemetry.GetInstance().CheckQueryInfo(postData)

	if (queryInfoResult.MetricsUsed || queryInfoResult.LogsUsed || queryInfoResult.TracesUsed) && (queryInfoResult.FilterApplied) {
		if queryInfoResult.MetricsUsed {
			telemetry.GetInstance().AddActiveMetricsUser()
		}
		if queryInfoResult.LogsUsed {
			telemetry.GetInstance().AddActiveLogsUser()
		}
		if queryInfoResult.TracesUsed {
			telemetry.GetInstance().AddActiveTracesUser()
		}
		data["metricsUsed"] = queryInfoResult.MetricsUsed
		data["logsUsed"] = queryInfoResult.LogsUsed
		data["tracesUsed"] = queryInfoResult.TracesUsed
		data["filterApplied"] = queryInfoResult.FilterApplied
		data["groupByApplied"] = queryInfoResult.GroupByApplied
		data["aggregateOperator"] = queryInfoResult.AggregateOperator
		data["aggregateAttributeKey"] = queryInfoResult.AggregateAttributeKey
		data["numberOfQueries"] = queryInfoResult.NumberOfQueries
		data["queryType"] = queryInfoResult.QueryType
		data["panelType"] = queryInfoResult.PanelType

		userEmail, err := auth.GetEmailFromJwt(r.Context())
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
		ctx := auth.AttachJwtToContext(r.Context(), r)
		r = r.WithContext(ctx)
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()

		queryRangeV3data, metadataExists := extractQueryRangeV3Data(path, r)
		getActiveLogs(path, r)

		lrw := NewLoggingResponseWriter(w)
		next.ServeHTTP(lrw, r)

		data := map[string]interface{}{"path": path, "statusCode": lrw.statusCode}
		if metadataExists {
			for key, value := range queryRangeV3data {
				data[key] = value
			}
		}

		// if telemetry.GetInstance().IsSampled() {
		if _, ok := telemetry.EnabledPaths()[path]; ok {
			userEmail, err := auth.GetEmailFromJwt(r.Context())
			if err == nil {
				telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_PATH, data, userEmail, true, false)
			}
		}
		// }

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
