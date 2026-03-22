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

// NamedService is a Service with a Name and optional dependencies.
type NamedService interface {
	Named
	Service
	// DependsOn returns the names of services that must be healthy before this service starts.
	DependsOn() []Name
}

type namedService struct {
	name      Name
	dependsOn []Name
	Service
}

// NewNamedService wraps a Service with a Name and optional dependency names.
func NewNamedService(name Name, service Service, dependsOn ...Name) NamedService {
	return &namedService{
		name:      name,
		dependsOn: dependsOn,
		Service:   service,
	}
}

func (s *namedService) Name() Name {
	return s.name
}

func (s *namedService) DependsOn() []Name {
	return s.dependsOn
}

// unwrapService extracts the underlying Service from a NamedService
// so optional interface checks (like Healthy) work correctly.
func unwrapService(ns NamedService) Service {
	if wrapped, ok := ns.(*namedService); ok {
		return wrapped.Service
	}
	return ns
}
