package registry

import (
	"context"
	"net"
	"net/http"
)

var _ NamedService = (*httpService)(nil)

type httpService struct {
	Listener net.Listener
	Server   *http.Server
	name     string
}

func newHttpService(name string) (*httpService, error) {
	return &httpService{
		name:   name,
		Server: &http.Server{},
	}, nil
}

func (service *httpService) Name() string {
	return service.name
}

func (service *httpService) Start(ctx context.Context) error {
	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		return err
	}
	service.Listener = listener

	if err := service.Server.Serve(service.Listener); err != nil {
		if err != http.ErrServerClosed {
			return err
		}
	}
	return nil
}

func (service *httpService) Stop(ctx context.Context) error {
	if err := service.Server.Shutdown(ctx); err != nil {
		return err
	}

	return nil
}
