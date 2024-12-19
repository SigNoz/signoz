package registry

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"
)

type Registry struct {
	services []NamedService
	logger   *zap.Logger
	startCh  chan error
	stopCh   chan error
}

// New creates a new registry of services. It needs at least one service in the input.
func New(logger *zap.Logger, services ...NamedService) (*Registry, error) {
	if logger == nil {
		return nil, fmt.Errorf("cannot build registry, logger is required")
	}

	if len(services) == 0 {
		return nil, fmt.Errorf("cannot build registry, at least one service is required")
	}

	return &Registry{
		logger:   logger.Named("go.signoz.io/pkg/registry"),
		services: services,
		startCh:  make(chan error, 1),
		stopCh:   make(chan error, len(services)),
	}, nil
}

func (r *Registry) Start(ctx context.Context) error {
	for _, s := range r.services {
		go func(s Service) {
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
		r.logger.Info("caught context error, exiting", zap.Any("context", ctx))
	case s := <-interrupt:
		r.logger.Info("caught interrupt signal, exiting", zap.Any("context", ctx), zap.Any("signal", s))
	case err := <-r.startCh:
		r.logger.Info("caught service error, exiting", zap.Any("context", ctx), zap.Error(err))
		return err
	}

	return nil
}

func (r *Registry) Stop(ctx context.Context) error {
	for _, s := range r.services {
		go func(s Service) {
			err := s.Stop(ctx)
			r.stopCh <- err
		}(s)
	}

	errs := make([]error, len(r.services))
	for i := 0; i < len(r.services); i++ {
		err := <-r.stopCh
		if err != nil {
			errs = append(errs, err)
		}
	}

	return errors.Join(errs...)
}
