package http

import (
	"context"
	"net/http"
	"time"

	"go.signoz.io/signoz/pkg/log"
	"go.signoz.io/signoz/pkg/registry"
)

// This is a wrapper over http.Server
type Server struct {
	srv     *http.Server
	logger  log.Logger
	handler http.Handler
	cfg     Config
}

// Creates a new http server, implements the registry.Service interface.
func New(logger log.Logger, handler http.Handler, cfg Config) registry.Service {
	srv := &http.Server{
		Addr:           cfg.Listen,
		Handler:        handler,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}

	return &Server{
		srv:     srv,
		logger:  logger,
		handler: handler,
		cfg:     cfg,
	}
}

func (server *Server) Start(ctx context.Context) error {
	server.logger.Info("starting http server")
	if err := server.srv.ListenAndServe(); err != nil {
		if err != http.ErrServerClosed {
			server.logger.Errorctx(ctx, "failed to start server", err)
			return err
		}
	}
	return nil
}

func (server *Server) Stop(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := server.srv.Shutdown(ctx); err != nil {
		server.logger.Errorctx(ctx, "failed to stop server", err)
		return err
	}

	server.logger.Infoctx(ctx, "server stopped gracefully")
	return nil
}
