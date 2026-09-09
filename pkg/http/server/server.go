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

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	srv := &http.Server{
		Addr:           cfg.Address,
		Handler:        handler,
		ReadTimeout:    cfg.ReadTimeout,
		WriteTimeout:   cfg.WriteTimeout,
		MaxHeaderBytes: 1 << 20,
	}

	if cfg.TLS.Enabled {
		tlsConfig, err := cfg.TLS.Config()
		if err != nil {
			return nil, err
		}

		srv.TLSConfig = tlsConfig
	}

	return &Server{
		srv:     srv,
		logger:  logger.With(slog.String("pkg", "go.signoz.io/pkg/http/server")),
		handler: handler,
		cfg:     cfg,
	}, nil
}

func (server *Server) Start(ctx context.Context) error {
	server.logger.InfoContext(ctx, "starting http server", slog.String("address", server.srv.Addr))

	var err error
	if server.cfg.TLS.Enabled {
		err = server.srv.ListenAndServeTLS("", "")
	} else {
		err = server.srv.ListenAndServe()
	}

	if err != nil && err != http.ErrServerClosed {
		server.logger.ErrorContext(ctx, "failed to start server", errors.Attr(err))
		return err
	}
	return nil
}

func (server *Server) Stop(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := server.srv.Shutdown(ctx); err != nil {
		server.logger.ErrorContext(ctx, "failed to stop server", errors.Attr(err))
		return err
	}

	server.logger.InfoContext(ctx, "server stopped gracefully")
	return nil
}
