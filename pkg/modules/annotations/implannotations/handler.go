package implannotations

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/annotations"
	"github.com/SigNoz/signoz/pkg/types/annotationtypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	module annotations.Module
}

func NewHandler(m annotations.Module) annotations.Handler {
	return &handler{
		module: m,
	}
}

func (h *handler) ListAnnotations(rw http.ResponseWriter, req *http.Request) {
	claims, err := authtypes.ClaimsFromContext(req.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var parsedReq annotationtypes.PostableAnnotations
	if err := binding.JSON.BindBody(req.Body, &parsedReq); err != nil {
		render.Error(rw, err)
		return
	}

	result, err := h.module.ListAnnotations(req.Context(), orgID, &parsedReq)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}
