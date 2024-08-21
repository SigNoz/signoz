package registry

import (
	"context"
	"fmt"
)

type Registry struct {
	services []Service
}

// NewRegistry creates a new registry of services. It needs at least one service in the input.
func NewRegistry(services ...Service) (*Registry, error) {
	if len(services) == 0 {
		return nil, fmt.Errorf("cannot build registry, at least one service is required")
	}

	return &Registry{
		services: services,
	}, nil
}

func (r *Registry) Start(ctx context.Context) error {
	errCh := make(chan error, len(r.services))

	for _, s := range r.services {
		go func(s Service) {
			err := s.Start(ctx)
			errCh <- err
		}(s)
	}

	for i := 0; i < len(r.services); i++ {
		err := <-errCh
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *Registry) Stop(ctx context.Context) error {
	errCh := make(chan error, len(r.services))

	for _, s := range r.services {
		go func(s Service) {
			err := s.Stop(ctx)
			errCh <- err
		}(s)
	}

	for range errCh {
		err := <-errCh
		if err != nil {
			return err
		}
	}

	return nil
}
