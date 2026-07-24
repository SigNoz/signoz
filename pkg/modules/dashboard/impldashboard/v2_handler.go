package impldashboard

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
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

	// Read the body ourselves (rather than binding straight from r.Body) so the
	// raw bytes survive a failed bind for the v1 fallback below.
	body, err := io.ReadAll(r.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var req dashboardtypes.PostableDashboardV2
	if err := binding.JSON.BindBody(bytes.NewReader(body), &req); err != nil {
		// Fallback: the body may be a legacy v1 dashboard. Migrate it to v2 (same
		// v4→v5 + v1→v2 pass the bulk migration runs) and retry; if it isn't a
		// convertible v1 payload either, surface the original v2 binding error.
		var data map[string]any
		if json.Unmarshal(body, &data) != nil {
			render.Error(rw, err)
			return
		}
		storable := dashboardtypes.StorableDashboard{Data: data, OrgID: orgID}
		transition.NewDashboardMigrateV5(handler.providerSettings.Logger, nil, nil).Migrate(ctx, storable.Data)
		v2, convErr := storable.ConvertV1ToV2()
		if convErr != nil {
			render.Error(rw, err)
			return
		}
		req = dashboardtypes.PostableDashboardV2{
			DashboardV2MetadataBase: v2.DashboardV2MetadataBase,
			Name:                    v2.Name,
			Tags:                    tagtypes.NewPostableTagsFromTags(v2.Tags),
			Spec:                    v2.Spec,
		}
	}

	dashboard, err := handler.module.CreateV2(ctx, orgID, claims.Email, valuer.MustNewUUID(claims.IdentityID()), dashboardtypes.SourceUser, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, dashboard.ToGettableDashboardV2())
}

func (handler *handler) CloneV2(rw http.ResponseWriter, r *http.Request) {
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

	dashboard, err := handler.module.CloneV2(ctx, orgID, claims.Email, valuer.MustNewUUID(claims.IdentityID()), dashboardID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, dashboard.ToGettableDashboardV2())
}

// ConvertAllV1ToV2 migrates every dashboard in the caller's org from the v1 to
// the v2 schema in place and returns the per-dashboard results. Temporary
// scaffolding for the schema migration.
func (handler *handler) ConvertAllV1ToV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	result, err := handler.module.ConvertAllV1ToV2(ctx, orgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, result)
}

func (handler *handler) ListV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)

	params := new(dashboardtypes.ListDashboardsV2Params)
	if err := binding.Query.BindQuery(r.URL.Query(), params); err != nil {
		render.Error(rw, err)
		return
	}
	if err := params.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := handler.module.ListV2(ctx, orgID, params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
}

func (handler *handler) ListForUserV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)
	userID := valuer.MustNewUUID(claims.IdentityID())

	params := new(dashboardtypes.ListDashboardsV2Params)
	if err := binding.Query.BindQuery(r.URL.Query(), params); err != nil {
		render.Error(rw, err)
		return
	}
	if err := params.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	out, err := handler.module.ListForUserV2(ctx, orgID, userID, params)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, out)
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

func (handler *handler) PinV2(rw http.ResponseWriter, r *http.Request) {
	handler.pinUnpinV2(rw, r, true)
}

func (handler *handler) UnpinV2(rw http.ResponseWriter, r *http.Request) {
	handler.pinUnpinV2(rw, r, false)
}

func (handler *handler) pinUnpinV2(rw http.ResponseWriter, r *http.Request, pin bool) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID := valuer.MustNewUUID(claims.OrgID)
	userID := valuer.MustNewUUID(claims.IdentityID())

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

	if pin {
		err = handler.module.PinV2(ctx, orgID, userID, dashboardID)
	} else {
		err = handler.module.UnpinV2(ctx, orgID, userID, dashboardID)
	}
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DeleteV2(rw http.ResponseWriter, r *http.Request) {
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

	if err := handler.module.DeleteV2(ctx, orgID, dashboardID); err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) GetPublicDataV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.GetDashboardByPublicIDV2(ctx, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard, err := handler.module.GetPublic(ctx, dashboard.OrgID, dashboard.ID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboardtypes.NewPublicDashboardDataFromDashboardV2(dashboard, publicDashboard))
}

func (handler *handler) GetPublicWidgetQueryRangeV2(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	panelKey, ok := mux.Vars(r)["key"]
	if !ok || panelKey == "" {
		render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodePublicDashboardInvalidInput, "panel key is missing from the path"))
		return
	}

	params := new(dashboardtypes.PublicWidgetQueryRangeParams)
	if err := binding.Query.BindQuery(r.URL.Query(), params); err != nil {
		render.Error(rw, err)
		return
	}

	queryRangeResults, err := handler.module.GetPublicWidgetQueryRangeV2(ctx, id, panelKey, params.StartTime, params.EndTime)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, queryRangeResults)
}
