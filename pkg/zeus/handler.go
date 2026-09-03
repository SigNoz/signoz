package zeus

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/tidwall/gjson"
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

func (h *handler) Checkout(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

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

	req := new(zeustypes.PostableSubscription)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	body, err := json.Marshal(req)
	if err != nil {
		render.Error(rw, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal checkout payload"))
		return
	}

	response, err := h.zeus.GetCheckoutURL(ctx, license.Key, body)
	if err != nil {
		if errors.Ast(err, errors.TypeAlreadyExists) {
			render.Error(rw, errors.WithAdditionalf(err, "checkout has already been completed for this account. Please click 'Refresh Status' to sync your subscription"))
			return
		}
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, &zeustypes.GettableSubscription{RedirectURL: gjson.GetBytes(response, "url").String()})
}

func (h *handler) Portal(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

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

	req := new(zeustypes.PostableSubscription)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	body, err := json.Marshal(req)
	if err != nil {
		render.Error(rw, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to marshal portal payload"))
		return
	}

	response, err := h.zeus.GetPortalURL(ctx, license.Key, body)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, &zeustypes.GettableSubscription{RedirectURL: gjson.GetBytes(response, "url").String()})
}

func (h *handler) GetMeters(rw http.ResponseWriter, r *http.Request) {
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

	data, err := h.zeus.GetMeters(ctx, license.Key)
	if err != nil {
		render.Error(rw, err)
		return
	}

	usage, err := zeustypes.NewGettableSubscriptionUsage(data)
	if err != nil {
		render.Error(rw, errors.Wrapf(err, errors.TypeInternal, ErrCodeResponseMalformed, "failed to unmarshal subscription usage"))
		return
	}

	render.Success(rw, http.StatusOK, usage)
}
