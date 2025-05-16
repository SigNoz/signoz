package impldashboard

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
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

	uuid := mux.Vars(req)["uuid"]

	err = handler.module.Delete(ctx, claims.OrgID, uuid)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, nil)
}
