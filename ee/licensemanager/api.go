package licensemanager

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/ee/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type licenseAPI struct {
	licensemanager License
}

func NewLicenseAPI(licensemanager License) API {
	return &licenseAPI{licensemanager: licensemanager}
}

func (api *licenseAPI) Activate(rw http.ResponseWriter, r *http.Request) {
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

	var req *licensetypes.ActivateLicense
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		render.Error(rw, err)
	}

	err = api.licensemanager.Activate(r.Context(), orgID, req.Key)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (api *licenseAPI) GetActive(rw http.ResponseWriter, r *http.Request) {
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

	gettableLicense, err := api.licensemanager.GetActive(r.Context(), orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, gettableLicense)
}

func (api *licenseAPI) Refresh(rw http.ResponseWriter, r *http.Request) {
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

	err = api.licensemanager.Refresh(r.Context(), orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
