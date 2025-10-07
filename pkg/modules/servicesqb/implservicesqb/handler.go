package implservicesqb

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/servicesqb"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
)

type Handler struct {
	Mod *Module
}

func NewHandler(m *Module) *Handler { return &Handler{Mod: m} }

func (h *Handler) Get(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 15*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var in servicesqb.Request
	if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := h.Mod.Get(ctx, claims.OrgID, &in)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, out)
}
