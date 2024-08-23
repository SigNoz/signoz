package server

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"go.signoz.io/signoz/pkg/registry"
	"go.uber.org/zap"
)

var _ registry.NamedService = (*Server)(nil)

type Server struct {
	srv     *http.Server
	logger  *zap.Logger
	handler http.Handler
	cfg     Config
	name    string
}

func New(logger *zap.Logger, name string, cfg Config, handler http.Handler) (*Server, error) {
	if handler == nil {
		return nil, fmt.Errorf("cannot build http server, handler is required")
	}

	if logger == nil {
		return nil, fmt.Errorf("cannot build http server, logger is required")
	}

	if name == "" {
		return nil, fmt.Errorf("cannot build http server, name is required")
	}

	srv := &http.Server{
		Addr:           cfg.Address,
		Handler:        handler,
		ReadTimeout:    10 * time.Second,
		WriteTimeout:   10 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}

	return &Server{
		srv:     srv,
		logger:  logger.Named("go.signoz.io/pkg/http/server"),
		handler: handler,
		cfg:     cfg,
		name:    name,
	}, nil
}

func (server *Server) Name() string {
	return server.name
}

func (server *Server) Start(ctx context.Context) error {
	server.logger.Info("starting http server", zap.String("address", server.srv.Addr))
	if err := server.srv.ListenAndServe(); err != nil {
		if err != http.ErrServerClosed {
			server.logger.Error("failed to start server", zap.Error(err), zap.Any("context", ctx))
			return err
		}
	}
	return nil
}

func (server *Server) Stop(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := server.srv.Shutdown(ctx); err != nil {
		server.logger.Error("failed to stop server", zap.Error(err), zap.Any("context", ctx))
		return err
	}

	server.logger.Info("server stopped gracefully", zap.Any("context", ctx))
	return nil
}
