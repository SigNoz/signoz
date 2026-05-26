package factory

import "context"

// Service is the core lifecycle interface for long-running services.
type Service interface {
	// Starts a service. It should block and should not return until the service is stopped or it fails.
	Start(context.Context) error

	// Stops a service.
	Stop(context.Context) error
}

// Healthy is an optional interface that services can implement to signal
// when they have completed startup and are ready to serve.
// Services that do not implement this interface are considered healthy
// immediately after Start() is called.
type Healthy interface {
	// Healthy returns a channel that is closed when the service is healthy.
	Healthy() <-chan struct{}
}

// ServiceWithHealthy is a Service that explicitly signals when it is healthy.
type ServiceWithHealthy interface {
	Service
	Healthy
}

// NamedService is a Service with a Name and optional dependencies.
type NamedService interface {
	Named
	ServiceWithHealthy
	// DependsOn returns the names of services that must be healthy before this service starts.
	DependsOn() []Name
}

// closedC is a pre-closed channel returned for services that don't implement Healthy.
var closedC = func() chan struct{} {
	c := make(chan struct{})
	close(c)
	return c
}()

type namedService struct {
	name      Name
	dependsOn []Name
	service   Service
}

// NewNamedService wraps a Service with a Name and optional dependency names.
func NewNamedService(name Name, service Service, dependsOn ...Name) NamedService {
	return &namedService{
		name:      name,
		dependsOn: dependsOn,
		service:   service,
	}
}

func (s *namedService) Name() Name {
	return s.name
}

func (s *namedService) DependsOn() []Name {
	return s.dependsOn
}

func (s *namedService) Start(ctx context.Context) error {
	return s.service.Start(ctx)
}

func (s *namedService) Stop(ctx context.Context) error {
	return s.service.Stop(ctx)
}

// Healthy delegates to the underlying service if it implements Healthy,
// otherwise returns an already-closed channel (immediately healthy).
func (s *namedService) Healthy() <-chan struct{} {
	if h, ok := s.service.(Healthy); ok {
		return h.Healthy()
	}
	return closedC
}
