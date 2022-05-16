package app

import (
	"fmt"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"go.signoz.io/query-service/app/dashboards"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	db "go.signoz.io/query-service/ee/app/db"
	"go.signoz.io/query-service/healthcheck"
	"go.signoz.io/query-service/utils"

	"go.uber.org/zap"
	"net"
	"net/http"
	"os"
)

type ServerOptions struct {
	HTTPHostPort string
}

type Server struct {
	serverOptions      *ServerOptions
	conn               net.Listener
	httpConn           net.Listener
	httpServer         *http.Server
	unavailableChannel chan healthcheck.Status
}

// HealthCheckStatus returns health check status channel a client can subscribe to
func (s Server) HealthCheckStatus() chan healthcheck.Status {
	return s.unavailableChannel
}

func NewServer(serverOptions *ServerOptions) (*Server, error) {
	if err := dao.InitDao("sqlite", constants.RELATIONAL_DATASOURCE_PATH); err != nil {
		return nil, err
	}
	s := &Server{
		serverOptions:      serverOptions,
		unavailableChannel: make(chan healthcheck.Status),
	}

	httpServer, err := s.createHTTPServer()
	if err != nil {
		return nil, err
	} else {
		s.httpServer = httpServer
	}

	return s, nil
}

func (s *Server) createHTTPServer() (*http.Server, error) {
	localDB, err := dashboards.InitDB(constants.RELATIONAL_DATASOURCE_PATH)
	if err != nil {
		return nil, err
	}
	localDB.SetMaxOpenConns(10)

	var dbReader DatabaseReader

	storage := os.Getenv("STORAGE")
	if storage == "clickhouse" {
		zap.S().Info("Using ClickHouse as datastore ...")
		dbReader = db.NewDBReader(localDB)
		go dbReader.Start()
	} else {
		return nil, fmt.Errorf("Storage type: %s is not supported in query service", storage)
	}

	apiHandler, err := NewAPIHandler(dbReader, dao.DB())
	if err != nil {
		return nil, err
	}

	r := NewRouter()
	// r.Use(setTimeoutMiddleware)
	// r.Use(s.analyticsMiddleware)
	// r.Use(loggingMiddleware)

	apiHandler.RegisterRoutes(r)
	// apiHandler.RegisterMetricsRoutes(r)

	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		// AllowCredentials: true,
		AllowedMethods: []string{"GET", "DELETE", "POST", "PUT"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	})

	handler := c.Handler(r)
	handler = handlers.CompressHandler(handler)

	return &http.Server{
		Handler: handler,
	}, nil

}

// NewRouter creates and configures a Gorilla Router.
func NewRouter() *mux.Router {
	return mux.NewRouter().UseEncodedPath()
}

// Start http server concurrently
func (s *Server) Start() error {

	if err := s.initListener(); err != nil {
		return err
	}

	var httpPort int
	if port, err := utils.GetPort(s.httpConn.Addr()); err == nil {
		httpPort = port
	}

	go func() {
		zap.S().Info("Starting HTTP server", zap.Int("port", httpPort), zap.String("addr", s.serverOptions.HTTPHostPort))

		switch err := s.httpServer.Serve(s.httpConn); err {
		case nil, http.ErrServerClosed:
			// normal exit, nothing to do
		default:
			zap.S().Error("Could not start HTTP server", zap.Error(err))
		}
		s.unavailableChannel <- healthcheck.Unavailable

	}()

	return nil
}

// initListener initialises listeners of the server
func (s *Server) initListener() error {
	var err error
	s.httpConn, err = net.Listen("tcp", s.serverOptions.HTTPHostPort)
	if err != nil {
		return err
	}
	zap.S().Info("Query server started ...")

	return nil

}
