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

type response struct {
	Healthy  bool             `json:"healthy"`
	Services map[State][]Name `json:"services"`
}

func (registry *Registry) Healthz(rw http.ResponseWriter, req *http.Request) {
	byState := registry.ServicesByState()
	healthy := registry.IsHealthy()

	statusCode := http.StatusOK
	if !healthy {
		statusCode = http.StatusServiceUnavailable
	}

	render.Success(rw, statusCode, response{
		Healthy:  healthy,
		Services: byState,
	})
}

func (registry *Registry) Readyz(rw http.ResponseWriter, req *http.Request) {
	healthy := registry.IsHealthy()

	statusCode := http.StatusOK
	if !healthy {
		statusCode = http.StatusServiceUnavailable
	}

	render.Success(rw, statusCode, response{
		Healthy:  healthy,
		Services: registry.ServicesByState(),
	})
}

func (registry *Registry) Livez(rw http.ResponseWriter, req *http.Request) {
	render.Success(rw, http.StatusOK, nil)
}
