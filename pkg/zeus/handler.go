package zeus

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
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

	req := new(zeustypes.PostableProfile)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if err := h.zeus.PutProfile(ctx, license.Key, req); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (h *handler) GetHosts(rw http.ResponseWriter, r *http.Request) {
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

	deploymentBytes, err := h.zeus.GetDeployment(ctx, license.Key)
	if err != nil {
		render.Error(rw, err)
		return
	}

	response := zeustypes.NewGettableHost(deploymentBytes)

	render.Success(rw, http.StatusOK, response)
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

	req := new(zeustypes.PostableHost)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	if req.Name == "" {
		render.Error(rw, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "name is required"))
		return
	}

	if err := h.zeus.PutHost(ctx, license.Key, req); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
