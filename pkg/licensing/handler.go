package licensing

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	licensing Licensing
}

func NewHandler(licensing Licensing) Handler {
	return &handler{licensing: licensing}
}

func (handler *handler) Create(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(licensetypes.PostableLicense)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	license, err := handler.licensing.Activate(ctx, valuer.MustNewUUID(claims.OrgID), req.Key)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, types.Identifiable{ID: license.ID})
}

func (handler *handler) List(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	licenses, err := handler.licensing.List(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	gettableLicenses := make([]*licensetypes.GettableLicense, 0, len(licenses))
	for _, license := range licenses {
		gettableLicenses = append(gettableLicenses, licensetypes.NewGettableLicense(license))
	}

	render.Success(rw, http.StatusOK, gettableLicenses)
}

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	licenseID, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	license, err := handler.licensing.Get(ctx, valuer.MustNewUUID(claims.OrgID), licenseID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, licensetypes.NewGettableLicenseWithKey(license))
}

func (handler *handler) Refresh(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	licenseID, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	activeLicense, err := handler.licensing.GetActive(ctx, orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if activeLicense.ID != licenseID {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "only the active license %s can be refreshed", activeLicense.ID.StringValue()))
		return
	}

	if err := handler.licensing.Refresh(ctx, orgID); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	licenseID, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	if err := handler.licensing.Delete(ctx, valuer.MustNewUUID(claims.OrgID), licenseID); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) GetActive(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	license, err := handler.licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, licensetypes.NewGettableActiveLicense(license))
}
