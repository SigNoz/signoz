package impldashboard

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module dashboard.Module
}

func NewHandler(module dashboard.Module) dashboard.Handler {
	return &handler{module: module}
}

func (handler *handler) Delete(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
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

	idStr := mux.Vars(req)["id"]
	dashboardID, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.Delete(ctx, orgID, dashboardID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, nil)
}

func (handler *handler) Create(http.ResponseWriter, *http.Request) {
	panic("unimplemented")
}

func (handler *handler) Get(http.ResponseWriter, *http.Request) {
	panic("unimplemented")
}

func (handler *handler) GetAll(http.ResponseWriter, *http.Request) {
	panic("unimplemented")
}

func (handler *handler) Update(http.ResponseWriter, *http.Request) {
	panic("unimplemented")
}
