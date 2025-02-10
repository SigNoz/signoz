package registry

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"go.signoz.io/signoz/pkg/factory"
)

type Registry struct {
	services factory.NamedMap[factory.NamedService]
	logger   *slog.Logger
	startCh  chan error
	stopCh   chan error
}

// New creates a new registry of services. It needs at least one service in the input.
func New(logger *slog.Logger, services ...factory.NamedService) (*Registry, error) {
	if logger == nil {
		return nil, fmt.Errorf("cannot build registry, logger is required")
	}

	if len(services) == 0 {
		return nil, fmt.Errorf("cannot build registry, at least one service is required")
	}

	m := factory.MustNewNamedMap(services...)

	return &Registry{
		logger:   logger,
		services: m,
		startCh:  make(chan error, 1),
		stopCh:   make(chan error, len(services)),
	}, nil
}

func (r *Registry) Start(ctx context.Context) error {
	for _, s := range r.services.GetInOrder() {
		go func(s factory.NamedService) {
			r.logger.InfoContext(ctx, "starting service", "service", s.Name())
			err := s.Start(ctx)
			if err != nil {
				r.logger.ErrorContext(ctx, "failed to start service", "service", s.Name(), "error", err)
				r.startCh <- err
			}
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
		go func(s factory.NamedService) {
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
