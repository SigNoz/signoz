package zeus

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	zeus      Zeus
	licensing licensing.Licensing
}

func NewHandler(zeus Zeus, licensing licensing.Licensing) Handler {
	return &handler{
		zeus:      zeus,
		licensing: licensing,
	}
}

func (h *handler) PutProfile(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	license, err := h.licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	var req zeustypes.PostableProfile
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.zeus.PutProfile(ctx, license.Key, &req); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (h *handler) PutHost(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	license, err := h.licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	var req zeustypes.PostableHost
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.zeus.PutHost(ctx, license.Key, &req); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
