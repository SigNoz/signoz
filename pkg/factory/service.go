package factory

import "context"

type Service interface {
	// Starts a service. The service should return an error if it cannot be started.
	Start(context.Context) error
	// Stops a service.
	Stop(context.Context) error
}
