package impldashboard

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module dashboard.Module
}

func NewHandler(module dashboard.Module) dashboard.Handler {
	return &handler{module: module}
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

	dashboard, err := handler.module.Create(ctx, orgID, claims.Email, req)
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

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
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

	dashboard, err := handler.module.Get(ctx, orgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}
	gettableDashboard, err := dashboardtypes.NewGettableDashboardFromDashboard(dashboard)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, gettableDashboard)
}

func (handler *handler) GetAll(rw http.ResponseWriter, r *http.Request) {
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

	dashboards, err := handler.module.GetAll(ctx, orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		render.Error(rw, err)
		return
	}

	if err != nil && errors.Ast(err, errors.TypeNotFound) {
		render.Success(rw, http.StatusOK, []*dashboardtypes.GettableDashboard{})
	}

	gettableDashboards, err := dashboardtypes.NewGettableDashboardsFromDashboards(dashboards)
	if err != nil {
		render.Error(rw, err)
		return
	}
	render.Success(rw, http.StatusOK, gettableDashboards)
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

	req := dashboardtypes.UpdatableDashboard{}
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.Update(ctx, orgID, id, claims.Email, req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboard)
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
	err = handler.module.Delete(ctx, orgID, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
