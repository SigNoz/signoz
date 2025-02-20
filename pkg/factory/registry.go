package factory

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
)

type Registry struct {
	services NamedMap[NamedService]
	logger   *slog.Logger
	startCh  chan error
	stopCh   chan error
}

// New creates a new registry of services. It needs at least one service in the input.
func NewRegistry(logger *slog.Logger, services ...NamedService) (*Registry, error) {
	if logger == nil {
		return nil, fmt.Errorf("cannot build registry, logger is required")
	}

	if len(services) == 0 {
		return nil, fmt.Errorf("cannot build registry, at least one service is required")
	}

	m, err := NewNamedMap(services...)
	if err != nil {
		return nil, err
	}

	return &Registry{
		logger:   logger.With("pkg", "go.signoz.io/pkg/factory"),
		services: m,
		startCh:  make(chan error, 1),
		stopCh:   make(chan error, len(services)),
	}, nil
}

func (r *Registry) Start(ctx context.Context) error {
	for _, s := range r.services.GetInOrder() {
		go func(s NamedService) {
			r.logger.InfoContext(ctx, "starting service", "service", s.Name())
			err := s.Start(ctx)
			r.startCh <- err
		}(s)
	}

	return nil
}

func (r *Registry) Wait(ctx context.Context) error {
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, syscall.SIGINT, syscall.SIGTERM)

	select {
	case <-ctx.Done():
		r.logger.InfoContext(ctx, "caught context error, exiting", "error", ctx.Err())
	case s := <-interrupt:
		r.logger.InfoContext(ctx, "caught interrupt signal, exiting", "signal", s)
	case err := <-r.startCh:
		r.logger.ErrorContext(ctx, "caught service error, exiting", "error", err)
		return err
	}

	return nil
}

func (r *Registry) Stop(ctx context.Context) error {
	for _, s := range r.services.GetInOrder() {
		go func(s NamedService) {
			r.logger.InfoContext(ctx, "stopping service", "service", s.Name())
			err := s.Stop(ctx)
			r.stopCh <- err
		}(s)
	}

	errs := make([]error, len(r.services.GetInOrder()))
	for i := 0; i < len(r.services.GetInOrder()); i++ {
		err := <-r.stopCh
		if err != nil {
			errs = append(errs, err)
		}
	}

	return errors.Join(errs...)
}
