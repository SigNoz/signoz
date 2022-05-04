package app

import (
	"context"
	"fmt"
	"net"
	"net/http"
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
	HTTPHostPort string
	// DruidClientUrl string
}

// Server runs HTTP, Mux and a grpc server
type Server struct {
	// logger       *zap.Logger
	// querySvc     *querysvc.QueryService
	// queryOptions *QueryOptions

	// tracer opentracing.Tracer // TODO make part of flags.Service
	serverOptions *ServerOptions
	conn          net.Listener
	// grpcConn           net.Listener
	httpConn net.Listener
	// grpcServer         *grpc.Server
	httpServer         *http.Server
	separatePorts      bool
	unavailableChannel chan healthcheck.Status
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

// NewServer creates and initializes Server
// func NewServer(logger *zap.Logger, querySvc *querysvc.QueryService, options *QueryOptions, tracer opentracing.Tracer) (*Server, error) {
func NewServer(serverOptions *ServerOptions) (*Server, error) {

	// _, httpPort, err := net.SplitHostPort(serverOptions.HTTPHostPort)
	// if err != nil {
	// 	return nil, err
	// }

	// _, grpcPort, err := net.SplitHostPort(options.GRPCHostPort)
	// if err != nil {
	// 	return nil, err
	// }

	// grpcServer, err := createGRPCServer(querySvc, options, logger, tracer)
	// if err != nil {
	// 	return nil, err
	// }

	if err := dao.InitDao("sqlite", constants.RELATIONAL_DATASOURCE_PATH); err != nil {
		return nil, err
	}

	s := &Server{
		// logger: logger,
		// querySvc:           querySvc,
		// queryOptions:       options,
		// tracer:             tracer,
		// grpcServer:         grpcServer,
		serverOptions: serverOptions,
		separatePorts: true,
		// separatePorts:      grpcPort != httpPort,
		unavailableChannel: make(chan healthcheck.Status),
	}
	httpServer, err := s.createHTTPServer()

	if err != nil {
		return nil, err
	}
	s.httpServer = httpServer

	return s, nil
}

func (s *Server) createHTTPServer() (*http.Server, error) {

	localDB, err := dashboards.InitDB(constants.RELATIONAL_DATASOURCE_PATH)
	if err != nil {
		return nil, err
	}
	localDB.SetMaxOpenConns(10)

	var reader Reader

	storage := os.Getenv("STORAGE")
	if storage == "druid" {
		zap.S().Info("Using Apache Druid as datastore ...")
		// reader = druidReader.NewReader(localDB)
	} else if storage == "clickhouse" {
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

	r := NewRouter()

	r.Use(setTimeoutMiddleware)
	r.Use(s.analyticsMiddleware)
	r.Use(loggingMiddleware)

	apiHandler.RegisterRoutes(r)
	apiHandler.RegisterMetricsRoutes(r)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		// AllowCredentials: true,
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	})

	handler := c.Handler(r)
	// var handler http.Handler = r

	handler = handlers.CompressHandler(handler)

	return &http.Server{
		Handler: handler,
	}, nil
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()
		startTime := time.Now()
		next.ServeHTTP(w, r)
		zap.S().Info(path, "\ttimeTaken: ", time.Now().Sub(startTime))
	})
}

func (s *Server) analyticsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route := mux.CurrentRoute(r)
		path, _ := route.GetPathTemplate()

		data := map[string]interface{}{"path": path}

		if _, ok := telemetry.IgnoredPaths()[path]; !ok {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_PATH, data)
		}

		next.ServeHTTP(w, r)
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

// initListener initialises listeners of the server
func (s *Server) initListener() (cmux.CMux, error) {
	if s.separatePorts { // use separate ports and listeners each for gRPC and HTTP requests
		var err error
		// s.grpcConn, err = net.Listen("tcp", s.queryOptions.GRPCHostPort)
		// if err != nil {
		// 	return nil, err
		// }

		s.httpConn, err = net.Listen("tcp", s.serverOptions.HTTPHostPort)
		if err != nil {
			return nil, err
		}
		zap.S().Info("Query server started ...")
		return nil, nil
	}

	// //  old behavior using cmux
	// conn, err := net.Listen("tcp", s.queryOptions.HostPort)
	// if err != nil {
	// 	return nil, err
	// }
	// s.conn = conn

	// var tcpPort int
	// if port, err := netutils

	// utils.GetPort(s.conn.Addr()); err == nil {
	// 	tcpPort = port
	// }

	// zap.S().Info(
	// 	"Query server started",
	// 	zap.Int("port", tcpPort),
	// 	zap.String("addr", s.queryOptions.HostPort))

	// // cmux server acts as a reverse-proxy between HTTP and GRPC backends.
	// cmuxServer := cmux.New(s.conn)

	// s.grpcConn = cmuxServer.MatchWithWriters(
	// 	cmux.HTTP2MatchHeaderFieldSendSettings("content-type", "application/grpc"),
	// 	cmux.HTTP2MatchHeaderFieldSendSettings("content-type", "application/grpc+proto"),
	// )
	// s.httpConn = cmuxServer.Match(cmux.Any())
	// s.queryOptions.HTTPHostPort = s.queryOptions.HostPort
	// s.queryOptions.GRPCHostPort = s.queryOptions.HostPort

	return nil, nil

}

// Start http, GRPC and cmux servers concurrently
func (s *Server) Start() error {

	_, err := s.initListener()
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

	return nil
}
