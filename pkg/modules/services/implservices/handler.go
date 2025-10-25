package implservices

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/services"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	Module services.Module
}

func NewHandler(m services.Module) services.Handler {
	return &handler{
		Module: m,
	}
}

func (h *handler) Get(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in servicetypesv1.Request
	if err := binding.JSON.BindBody(req.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	orgUUID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}
	out, err := h.Module.Get(req.Context(), orgUUID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, out)
}

func (h *handler) GetTopOperations(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in servicetypesv1.OperationsRequest
	if err := binding.JSON.BindBody(req.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	orgUUID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}
	out, err := h.Module.GetTopOperations(req.Context(), orgUUID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, out)
}

func (h *handler) GetEntryPointOperations(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in servicetypesv1.OperationsRequest
	if err := binding.JSON.BindBody(req.Body, &in); err != nil {
		render.Error(rw, err)
		return
	}

	orgUUID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}
	out, err := h.Module.GetEntryPointOperations(req.Context(), orgUUID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, out)
}
