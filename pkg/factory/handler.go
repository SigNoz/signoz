package factory

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
)

// Handler provides HTTP handler functions for service health checks.
type Handler interface {
	// Readyz reports whether services are ready.
	Readyz(http.ResponseWriter, *http.Request)

	// Livez reports whether services are alive.
	Livez(http.ResponseWriter, *http.Request)

	// Healthz reports overall service health.
	Healthz(http.ResponseWriter, *http.Request)
}

type handler struct {
	registry *Registry
}

func NewHandler(registry *Registry) Handler {
	return &handler{
		registry: registry,
	}
}

type Response struct {
	Healthy  bool             `json:"healthy"`
	Services map[State][]Name `json:"services"`
}

func (handler *handler) Healthz(rw http.ResponseWriter, req *http.Request) {
	byState := handler.registry.ServicesByState()
	healthy := handler.registry.IsHealthy()

	statusCode := http.StatusOK
	if !healthy {
		statusCode = http.StatusServiceUnavailable
	}

	render.Success(rw, statusCode, Response{
		Healthy:  healthy,
		Services: byState,
	})
}

func (handler *handler) Readyz(rw http.ResponseWriter, req *http.Request) {
	healthy := handler.registry.IsHealthy()

	statusCode := http.StatusOK
	if !healthy {
		statusCode = http.StatusServiceUnavailable
	}

	render.Success(rw, statusCode, Response{
		Healthy:  healthy,
		Services: handler.registry.ServicesByState(),
	})
}

func (handler *handler) Livez(rw http.ResponseWriter, req *http.Request) {
	render.Success(rw, http.StatusOK, nil)
}
