package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Service = (*Server)(nil)

type Server struct {
	srv     *http.Server
	logger  *slog.Logger
	handler http.Handler
	cfg     Config
}

func New(logger *slog.Logger, cfg Config, handler http.Handler) (*Server, error) {
	if handler == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "cannot build http server, handler is required")
	}

	if logger == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "cannot build http server, logger is required")
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
		logger:  logger.With("pkg", "go.signoz.io/pkg/http/server"),
		handler: handler,
		cfg:     cfg,
	}, nil
}

func (server *Server) Start(ctx context.Context) error {
	server.logger.InfoContext(ctx, "starting http server", "address", server.srv.Addr)
	if err := server.srv.ListenAndServe(); err != nil {
		if err != http.ErrServerClosed {
			server.logger.ErrorContext(ctx, "failed to start server", "error", err)
			return err
		}
	}
	return nil
}

func (server *Server) Stop(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := server.srv.Shutdown(ctx); err != nil {
		server.logger.ErrorContext(ctx, "failed to stop server", "error", err)
		return err
	}

	server.logger.InfoContext(ctx, "server stopped gracefully")
	return nil
}
