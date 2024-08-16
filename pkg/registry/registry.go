package registry

import "context"

type Registry struct {
	services []Service
}

// NewRegistry creates a new registry of services. It needs at least one service as input.
// It
func NewRegistry(services ...Service) (*Registry, error) {
	return nil, nil
}

// Starts all services in the registry. It returns an error
// if any of the services throw an error on start.
func (r *Registry) Start(ctx context.Context) error {
	errCh := make(chan error, len(r.services))

	for _, s := range r.services {
		go func(s Service) {
			err := s.Start(ctx)
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

// Stops all services in the registry. It returns an error
// if any of the services throw an error on stop.
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
