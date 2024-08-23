package registry

import "context"

type Service interface {
	// Starts a service. The service should return an error if it cannot be started.
	Start(context.Context) error
	// Stops a service.
	Stop(context.Context) error
}

type NamedService interface {
	// Identifier of a service. It should be unique across all services.
	Name() string
	Service
}
