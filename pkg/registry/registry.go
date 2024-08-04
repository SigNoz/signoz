package registry

import "context"

type Service interface {
	// Starts the service.
	Start(context.Context) error
	// Stops the service gracefully.
	Stop(context.Context) error
}
