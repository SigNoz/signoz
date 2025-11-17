package impldashboard

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module           dashboard.Module
	providerSettings factory.ProviderSettings
	querier          querier.Querier
	licensing        licensing.Licensing
}

func NewHandler(module dashboard.Module, providerSettings factory.ProviderSettings, querier querier.Querier, licensing licensing.Licensing) dashboard.Handler {
	return &handler{module: module, providerSettings: providerSettings, querier: querier, licensing: licensing}
}

func (handler *handler) Create(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := dashboardtypes.PostableDashboard{}
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboardMigrator := transition.NewDashboardMigrateV5(handler.providerSettings.Logger, nil, nil)
	if req["version"] != "v5" {
		dashboardMigrator.Migrate(ctx, req)
	}

	dashboard, err := handler.module.Create(ctx, orgID, claims.Email, valuer.MustNewUUID(claims.UserID), req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	gettableDashboard, err := dashboardtypes.NewGettableDashboardFromDashboard(dashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, gettableDashboard)
}

func (handler *handler) Update(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

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

	req := dashboardtypes.UpdatableDashboard{}
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	diff := 0
	// Allow multiple deletions for API key requests; enforce for others
	if authType, ok := ctxtypes.AuthTypeFromContext(ctx); ok && authType == ctxtypes.AuthTypeTokenizer {
		diff = 1
	}

	dashboard, err := handler.module.Update(ctx, orgID, dashboardID, claims.Email, req, diff)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboard)
}

func (handler *handler) LockUnlock(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

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

	req := new(dashboardtypes.LockUnlockDashboard)
	err = json.NewDecoder(r.Body).Decode(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.LockUnlock(ctx, orgID, dashboardID, claims.Email, claims.Role, *req.Locked)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, nil)

}

func (handler *handler) Delete(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

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
	err = handler.module.Delete(ctx, orgID, dashboardID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) CreatePublic(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = handler.licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error()))
		return
	}

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = handler.module.Get(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(dashboardtypes.PostablePublicDashboard)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard := dashboardtypes.NewPublicDashboard(req.TimeRangeEnabled, req.DefaultTimeRange, id)
	err = handler.module.CreatePublic(ctx, valuer.MustNewUUID(claims.OrgID), publicDashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, nil)
}

func (handler *handler) GetPublic(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = handler.licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error()))
		return
	}

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = handler.module.Get(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard, err := handler.module.GetPublic(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboardtypes.NewGettablePublicDashboard(publicDashboard))
}

func (handler *handler) GetPublicData(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.GetDashboardByPublicID(ctx, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard, err := handler.module.GetPublic(ctx, dashboard.OrgID, valuer.MustNewUUID(dashboard.ID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	gettablePublicDashboardData, err := dashboardtypes.NewPublicDashboardDataFromDashboard(dashboard, publicDashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, gettablePublicDashboardData)
}

func (handler *handler) GetPublicWidgetQueryRange(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	widgetIndex, ok := mux.Vars(r)["index"]
	if !ok {
		render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodePublicDashboardInvalidInput, "widget index is missing from the path"))
		return
	}

	dashboard, err := handler.module.GetDashboardByPublicID(ctx, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard, err := handler.module.GetPublic(ctx, dashboard.OrgID, valuer.MustNewUUID(dashboard.ID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	widgetIdxInt, err := strconv.ParseInt(widgetIndex, 10, 64)
	if err != nil {
		render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodePublicDashboardInvalidInput, "invalid widget index"))
		return
	}

	var startTime, endTime uint64
	if publicDashboard.TimeRangeEnabled {
		startTimeUint, err := strconv.ParseUint(r.URL.Query().Get("startTime"), 10, 64)
		if err != nil {
			render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodePublicDashboardInvalidInput, "invalid startTime"))
			return
		}

		endTimeUint, err := strconv.ParseUint(r.URL.Query().Get("endTime"), 10, 64)
		if err != nil {
			render.Error(rw, errors.New(errors.TypeInvalidInput, dashboardtypes.ErrCodePublicDashboardInvalidInput, "invalid endTime"))
			return
		}

		startTime = startTimeUint
		endTime = endTimeUint
	} else {
		timeRange, err := time.ParseDuration(publicDashboard.DefaultTimeRange)
		if err != nil {
			// this should't happen as we shouldn't let such values in DB
			panic(err)
		}

		startTime = uint64(time.Now().Add(-timeRange).UnixMilli())
		endTime = uint64(time.Now().UnixMilli())
	}

	query, err := dashboard.GetWidgetQuery(startTime, endTime, widgetIdxInt, handler.providerSettings.Logger)
	if err != nil {
		render.Error(rw, err)
		return
	}

	queryRangeResults, err := handler.querier.QueryRange(ctx, dashboard.OrgID, query)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, queryRangeResults)
}

func (handler *handler) UpdatePublic(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = handler.licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error()))
		return
	}

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = handler.module.Get(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(dashboardtypes.UpdatablePublicDashboard)
	if err := binding.JSON.BindBody(r.Body, req); err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard, err := handler.module.GetPublic(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	publicDashboard.Update(req.TimeRangeEnabled, req.DefaultTimeRange)
	err = handler.module.UpdatePublic(ctx, publicDashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DeletePublic(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = handler.licensing.GetActive(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error()))
		return
	}

	id, err := valuer.NewUUID(mux.Vars(r)["id"])
	if err != nil {
		render.Error(rw, err)
		return
	}

	_, err = handler.module.Get(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.DeletePublic(ctx, valuer.MustNewUUID(claims.OrgID), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
