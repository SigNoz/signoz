package registry

import "context"

type Service interface {
	// Starts a service.
	Start(context.Context) error
	// Stops a service.
	Stop(context.Context) error
}
