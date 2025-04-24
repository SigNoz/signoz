package implorganization

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

type organizationAPI struct {
	module organization.Module
}

func NewAPI(module organization.Module) organization.API {
	return &organizationAPI{module: module}
}

func (api *organizationAPI) Get(rw http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, err.Error()))
		return
	}

	organization, err := api.module.Get(r.Context(), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, organization)
}

func (api *organizationAPI) GetAll(rw http.ResponseWriter, r *http.Request) {
	organizations, err := api.module.GetAll(r.Context())
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, organizations)
}

func (api *organizationAPI) Update(rw http.ResponseWriter, r *http.Request) {
	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, err.Error()))
		return
	}

	var req *types.Organization
	err = json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		render.Error(rw, err)
	}

	req.ID = id
	err = api.module.Update(r.Context(), req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	data := map[string]interface{}{
		"organizationName": req.Name,
	}
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		zap.L().Error("failed to get user email from jwt")
	}
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_ORG_SETTINGS, data, claims.Email, true, false)

	render.Success(rw, http.StatusNoContent, nil)
}
