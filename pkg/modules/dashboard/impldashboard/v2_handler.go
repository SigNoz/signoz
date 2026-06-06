package impldashboard

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (handler *handler) CreateV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	var req dashboardtypes.PostableDashboardV2
	if err := binding.JSON.BindBody(r.Body, &req); err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.CreateV2(ctx, orgID, claims.Email, valuer.MustNewUUID(claims.IdentityID()), dashboardtypes.SourceUser, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, dashboard.ToGettableDashboardV2())
}

func (handler *handler) GetV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	id := mux.Vars(r)["id"]
	if id == "" {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is missing in the path"))
		return
	}
	dashboardID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.GetV2(ctx, orgID, dashboardID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboard.ToGettableDashboardV2())
}

func (handler *handler) LockV2(rw http.ResponseWriter, r *http.Request) {
	handler.lockUnlockV2(rw, r, true)
}

func (handler *handler) UnlockV2(rw http.ResponseWriter, r *http.Request) {
	handler.lockUnlockV2(rw, r, false)
}

func (handler *handler) lockUnlockV2(rw http.ResponseWriter, r *http.Request, lock bool) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	id := mux.Vars(r)["id"]
	if id == "" {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is missing in the path"))
		return
	}
	dashboardID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	isAdmin := false
	selectors := []coretypes.Selector{
		coretypes.TypeRole.MustSelector(authtypes.SigNozAdminRoleName),
	}
	err = handler.authz.CheckWithTupleCreation(
		ctx,
		claims,
		orgID,
		authtypes.Relation{Verb: coretypes.VerbAssignee},
		coretypes.NewResourceRole(),
		selectors,
		selectors,
	)
	if err == nil {
		isAdmin = true
	}

	if err := handler.module.LockUnlockV2(ctx, orgID, dashboardID, claims.Email, isAdmin, lock); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) UpdateV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	id := mux.Vars(r)["id"]
	if id == "" {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is missing in the path"))
		return
	}
	dashboardID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := dashboardtypes.UpdatableDashboardV2{}
	if err := binding.JSON.BindBody(r.Body, &req); err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.UpdateV2(ctx, orgID, dashboardID, claims.Email, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboard.ToGettableDashboardV2())
}

func (handler *handler) PatchV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	id := mux.Vars(r)["id"]
	if id == "" {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is missing in the path"))
		return
	}
	dashboardID, err := valuer.NewUUID(id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := dashboardtypes.PatchableDashboardV2{}
	if err := binding.JSON.BindBody(r.Body, &req); err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.PatchV2(ctx, orgID, dashboardID, claims.Email, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboard.ToGettableDashboardV2())
}
