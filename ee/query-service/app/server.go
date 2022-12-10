package app

import (
	"context"
	"fmt"
	"net"
	"net/http"
	_ "net/http/pprof" // http profiler
	"os"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"

	"github.com/rs/cors"
	"github.com/soheilhy/cmux"
	"go.signoz.io/signoz/ee/query-service/app/api"
	"go.signoz.io/signoz/ee/query-service/app/db"
	"go.signoz.io/signoz/ee/query-service/dao"
	"go.signoz.io/signoz/ee/query-service/interfaces"
	licensepkg "go.signoz.io/signoz/ee/query-service/license"
	"go.signoz.io/signoz/ee/query-service/usage"

	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	baseconst "go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/healthcheck"
	basealm "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	baseint "go.signoz.io/signoz/pkg/query-service/interfaces"
	pqle "go.signoz.io/signoz/pkg/query-service/pqlEngine"
	rules "go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
)

type ServerOptions struct {
	PromConfigPath  string
	HTTPHostPort    string
	PrivateHostPort string
	// alert specific params
	DisableRules bool
	RuleRepoURL  string
}

// Server runs HTTP api service
type Server struct {
	serverOptions *ServerOptions
	conn          net.Listener
	ruleManager   *rules.Manager
	separatePorts bool

	// public http router
	httpConn   net.Listener
	httpServer *http.Server

	// private http
	privateConn net.Listener
	privateHTTP *http.Server

	// feature flags
	featureLookup baseint.FeatureLookup

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

	localDB, err := dashboards.InitDB(baseconst.RELATIONAL_DATASOURCE_PATH)

	if err != nil {
		return nil, err
	}

	localDB.SetMaxOpenConns(10)

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
		zap.S().Info("Using ClickHouse as datastore ...")
		qb := db.NewDataConnector(localDB, serverOptions.PromConfigPath, lm)
		go qb.Start(readerReady)
		reader = qb
	} else {
		return nil, fmt.Errorf("Storage type: %s is not supported in query service", storage)
	}

	<-readerReady
	rm, err := makeRulesManager(serverOptions.PromConfigPath,
		baseconst.GetAlertManagerApiPrefix(),
		serverOptions.RuleRepoURL,
		localDB,
		reader,
		serverOptions.DisableRules)

	if err != nil {
		return nil, err
	}

	// start the usagemanager
	usageManager, err := usage.New("sqlite", localDB, lm.GetRepo(), reader.GetConn())
	if err != nil {
		return nil, err
	}
	err = usageManager.Start()
	if err != nil {
		return nil, err
	}

	telemetry.GetInstance().SetReader(reader)

	apiOpts := api.APIHandlerOptions{
		DataConnector:  reader,
		AppDao:         modelDao,
		RulesManager:   rm,
		FeatureFlags:   lm,
		LicenseManager: lm,
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

	return s, nil
}

func (s *Server) createPrivateServer(apiHandler *api.APIHandler) (*http.Server, error) {

	r := mux.NewRouter()

	r.Use(setTimeoutMiddleware)
	r.Use(s.analyticsMiddleware)
	r.Use(loggingMiddlewarePrivate)

	apiHandler.RegisterPrivateRoutes(r)

	c := cors.New(cors.Options{
		//todo(amol): find out a way to add exact domain or
		// ip here for alert manager
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	})

	handler := c.Handler(r)
	handler = handlers.CompressHandler(handler)

	return &http.Server{
		Handler: handler,
	}, nil
}

func (s *Server) createPublicServer(apiHandler *api.APIHandler) (*http.Server, error) {

	r := mux.NewRouter()

	r.Use(setTimeoutMiddleware)
	r.Use(s.analyticsMiddleware)
	r.Use(loggingMiddleware)

	apiHandler.RegisterRoutes(r)
	apiHandler.RegisterMetricsRoutes(r)
	apiHandler.RegisterLogsRoutes(r)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT", "PATCH", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "cache-control"},
	})

	handler := c.Handler(r)

	handler = handlers.CompressHandler(handler)

	return &http.Server{
		Handler: handler,
	}, nil
}

// loggingMiddleware is used for logging public api calls
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()
		startTime := time.Now()
		next.ServeHTTP(w, r)
		zap.S().Info(path, "\ttimeTaken: ", time.Now().Sub(startTime))
	})
}

// loggingMiddlewarePrivate is used for logging private api calls
// from internal services like alert manager
func loggingMiddlewarePrivate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()
		startTime := time.Now()
		next.ServeHTTP(w, r)
		zap.S().Info(path, "\tprivatePort: true", "\ttimeTaken: ", time.Now().Sub(startTime))
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func NewLoggingResponseWriter(w http.ResponseWriter) *loggingResponseWriter {
	// WriteHeader(int) is not called if our response implicitly returns 200 OK, so
	// we default to that status code.
	return &loggingResponseWriter{w, http.StatusOK}
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// Flush implements the http.Flush interface.
func (lrw *loggingResponseWriter) Flush() {
	lrw.ResponseWriter.(http.Flusher).Flush()
}

func (s *Server) analyticsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()

		lrw := NewLoggingResponseWriter(w)
		next.ServeHTTP(lrw, r)

		data := map[string]interface{}{"path": path, "statusCode": lrw.statusCode}

		if _, ok := telemetry.IgnoredPaths()[path]; !ok {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_PATH, data)
		}

	})
}

func setTimeoutMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var cancel context.CancelFunc
		// check if route is not excluded
		url := r.URL.Path
		if _, ok := baseconst.TimeoutExcludedRoutes[url]; !ok {
			ctx, cancel = context.WithTimeout(r.Context(), baseconst.ContextTimeout*time.Second)
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

	zap.S().Info(fmt.Sprintf("Query server started listening on %s...", s.serverOptions.HTTPHostPort))

	// listen on private port to support internal services
	privateHostPort := s.serverOptions.PrivateHostPort

	if privateHostPort == "" {
		return fmt.Errorf("baseconst.PrivateHostPort is required")
	}

	s.privateConn, err = net.Listen("tcp", privateHostPort)
	if err != nil {
		return err
	}
	zap.S().Info(fmt.Sprintf("Query server started listening on private port %s...", s.serverOptions.PrivateHostPort))

	return nil
}

// Start listening on http and private http port concurrently
func (s *Server) Start() error {

	// initiate rule manager first
	if !s.serverOptions.DisableRules {
		s.ruleManager.Start()
	} else {
		zap.S().Info("msg: Rules disabled as rules.disable is set to TRUE")
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
		zap.S().Info("Starting HTTP server", zap.Int("port", httpPort), zap.String("addr", s.serverOptions.HTTPHostPort))

		switch err := s.httpServer.Serve(s.httpConn); err {
		case nil, http.ErrServerClosed, cmux.ErrListenerClosed:
			// normal exit, nothing to do
		default:
			zap.S().Error("Could not start HTTP server", zap.Error(err))
		}
		s.unavailableChannel <- healthcheck.Unavailable
	}()

	go func() {
		zap.S().Info("Starting pprof server", zap.String("addr", baseconst.DebugHttpPort))

		err = http.ListenAndServe(baseconst.DebugHttpPort, nil)
		if err != nil {
			zap.S().Error("Could not start pprof server", zap.Error(err))
		}
	}()

	var privatePort int
	if port, err := utils.GetPort(s.privateConn.Addr()); err == nil {
		privatePort = port
	}
	fmt.Println("starting private http")
	go func() {
		zap.S().Info("Starting Private HTTP server", zap.Int("port", privatePort), zap.String("addr", s.serverOptions.PrivateHostPort))

		switch err := s.privateHTTP.Serve(s.privateConn); err {
		case nil, http.ErrServerClosed, cmux.ErrListenerClosed:
			// normal exit, nothing to do
			zap.S().Info("private http server closed")
		default:
			zap.S().Error("Could not start private HTTP server", zap.Error(err))
		}

		s.unavailableChannel <- healthcheck.Unavailable

	}()

	return nil
}

func makeRulesManager(
	promConfigPath,
	alertManagerURL string,
	ruleRepoURL string,
	db *sqlx.DB,
	ch baseint.Reader,
	disableRules bool) (*rules.Manager, error) {

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
	managerOpts := &rules.ManagerOptions{
		NotifierOpts: notifierOpts,
		Queriers: &rules.Queriers{
			PqlEngine: pqle,
			Ch:        ch.GetConn(),
		},
		RepoURL:      ruleRepoURL,
		DBConn:       db,
		Context:      context.Background(),
		Logger:       nil,
		DisableRules: disableRules,
	}

	// create Manager
	manager, err := rules.NewManager(managerOpts)
	if err != nil {
		return nil, fmt.Errorf("rule manager error: %v", err)
	}

	zap.S().Info("rules manager is ready")

	return manager, nil
}
