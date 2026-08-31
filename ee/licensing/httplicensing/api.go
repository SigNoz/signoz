package httplicensing

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type licensingAPI struct {
	licensing licensing.Licensing
}

func NewLicensingAPI(licensing licensing.Licensing) licensing.API {
	return &licensingAPI{licensing: licensing}
}

func (api *licensingAPI) Checkout(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is invalid"))
		return
	}

	req := new(licensetypes.PostableSubscription)
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		render.Error(rw, err)
		return
	}

	gettableSubscription, err := api.licensing.Checkout(ctx, orgID, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, gettableSubscription)
}

func (api *licensingAPI) Portal(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "orgId is invalid"))
		return
	}

	req := new(licensetypes.PostableSubscription)
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		render.Error(rw, err)
		return
	}

	gettableSubscription, err := api.licensing.Portal(ctx, orgID, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, gettableSubscription)
}
