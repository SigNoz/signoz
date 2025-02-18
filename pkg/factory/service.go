package factory

import "context"

type Service interface {
	// Starts a service. The service should return an error if it cannot be started.
	Start(context.Context) error
	// Stops a service.
	Stop(context.Context) error
}

type NamedService interface {
	Named
	Service
}

type namedService struct {
	name Name
	Service
}

func (s *namedService) Name() Name {
	return s.name
}

func NewNamedService(name Name, service Service) NamedService {
	return &namedService{
		name:    name,
		Service: service,
	}
}
