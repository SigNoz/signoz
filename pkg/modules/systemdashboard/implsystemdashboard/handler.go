package implsystemdashboard

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/systemdashboard"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type handler struct {
	module systemdashboard.Module
}

func NewHandler(module systemdashboard.Module) systemdashboard.Handler {
	return &handler{module: module}
}

func (handler *handler) Get(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.Get(ctx, valuer.MustNewUUID(claims.OrgID), parseSource(r))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboard)
}

func (handler *handler) Update(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	data := dashboardtypes.UpdatableDashboard{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		render.Error(rw, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid request body"))
		return
	}

	if data == nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "data is required"))
		return
	}

	dashboard, err := handler.module.Update(ctx, valuer.MustNewUUID(claims.OrgID), parseSource(r),
		dashboardtypes.NewDashboardFromUpdatable(data, claims.Email))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboard)
}

func (handler *handler) Reset(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	dashboard, err := handler.module.Reset(ctx, valuer.MustNewUUID(claims.OrgID), parseSource(r))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, dashboard)
}

// parseSource reads the {source} path segment.
func parseSource(r *http.Request) dashboardtypes.Source {
	return dashboardtypes.Source(mux.Vars(r)["source"])
}
