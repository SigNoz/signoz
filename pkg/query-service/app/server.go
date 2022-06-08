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

	"github.com/rs/cors"
	"github.com/soheilhy/cmux"
	"go.signoz.io/query-service/app/clickhouseReader"
	"go.signoz.io/query-service/app/dashboards"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/healthcheck"
	"go.signoz.io/query-service/telemetry"
	"go.signoz.io/query-service/utils"
	"go.uber.org/zap"
)

type ServerOptions struct {
	HTTPHostPort    string
	PrivateHostPort string
}

// Server runs HTTP, Mux and a grpc server
type Server struct {
	// logger       *zap.Logger
	// tracer opentracing.Tracer // TODO make part of flags.Service
	serverOptions *ServerOptions

	// public http router
	httpConn   net.Listener
	httpServer *http.Server

	// private http
	privateConn net.Listener
	privateHTTP *http.Server

	unavailableChannel chan healthcheck.Status
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

// NewServer creates and initializes Server
func NewServer(serverOptions *ServerOptions) (*Server, error) {

	if err := dao.InitDao("sqlite", constants.RELATIONAL_DATASOURCE_PATH); err != nil {
		return nil, err
	}
	localDB, err := dashboards.InitDB(constants.RELATIONAL_DATASOURCE_PATH)

	if err != nil {
		return nil, err
	}

	localDB.SetMaxOpenConns(10)

	var reader Reader
	storage := os.Getenv("STORAGE")
	if storage == "clickhouse" {
		zap.S().Info("Using ClickHouse as datastore ...")
		clickhouseReader := clickhouseReader.NewReader(localDB)
		go clickhouseReader.Start()
		reader = clickhouseReader
	} else {
		return nil, fmt.Errorf("Storage type: %s is not supported in query service", storage)
	}

	apiHandler, err := NewAPIHandler(&reader, dao.DB())
	if err != nil {
		return nil, err
	}

	s := &Server{
		// logger: logger,
		// tracer: tracer,
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

func (s *Server) createPrivateServer(api *APIHandler) (*http.Server, error) {

	r := NewRouter()

	r.Use(setTimeoutMiddleware)
	r.Use(s.analyticsMiddleware)
	r.Use(loggingMiddlewarePrivate)

	api.RegisterPrivateRoutes(r)

	c := cors.New(cors.Options{
		//todo(amol): find out a way to add exact domain or
		// ip here for alert manager
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	})

	handler := c.Handler(r)
	handler = handlers.CompressHandler(handler)

	return &http.Server{
		Handler: handler,
	}, nil
}

func (s *Server) createPublicServer(api *APIHandler) (*http.Server, error) {

	r := NewRouter()

	r.Use(setTimeoutMiddleware)
	r.Use(s.analyticsMiddleware)
	r.Use(loggingMiddleware)

	api.RegisterRoutes(r)
	api.RegisterMetricsRoutes(r)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
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
		ctx, cancel := context.WithTimeout(r.Context(), constants.ContextTimeout*time.Second)
		defer cancel()

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

	zap.S().Info(fmt.Sprintf("Query server started listening on %s...", s.serverOptions.HTTPHostPort))

	// listen on private port to support internal services
	privateHostPort := s.serverOptions.PrivateHostPort

	if privateHostPort == "" {
		return fmt.Errorf("constants.PrivateHostPort is required")
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
		zap.S().Info("Starting pprof server", zap.String("addr", constants.DebugHttpPort))

		err = http.ListenAndServe(constants.DebugHttpPort, nil)
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
