package implinfrastructuremonitoring

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/infrastructuremonitoring"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/infrastructuremonitoringtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

func (h *handler) GetPodsList(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var payload infrastructuremonitoringtypes.PodsListRequest
	if err := json.NewDecoder(req.Body).Decode(&payload); err != nil {
		render.Error(rw, err)
		return
	}

	response, err := h.module.GetPodsList(req.Context(), orgID, &payload)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, response)
}
