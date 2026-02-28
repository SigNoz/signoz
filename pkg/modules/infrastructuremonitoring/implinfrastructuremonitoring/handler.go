package implinfrastructuremonitoring

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/infrastructuremonitoring"
)

type handler struct {
	module infrastructuremonitoring.Module
}

// NewHandler returns a infrastructuremonitoring.Handler implementation.
func NewHandler(m infrastructuremonitoring.Module) infrastructuremonitoring.Handler {
	return &handler{
		module: m,
	}
}

func (h *handler) HealthCheck(rw http.ResponseWriter, req *http.Request) {
	msg, err := h.module.HealthCheck(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, msg)
}
