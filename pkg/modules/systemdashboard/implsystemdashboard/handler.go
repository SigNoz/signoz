package implsystemdashboard

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/systemdashboard"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
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

	name := mux.Vars(r)["name"]
	if name == "" {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "name is missing in the path"))
		return
	}

	systemDashboard, err := handler.module.Get(ctx, valuer.MustNewUUID(claims.OrgID), name)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, systemDashboard.ToGettableSystemDashboard())
}

