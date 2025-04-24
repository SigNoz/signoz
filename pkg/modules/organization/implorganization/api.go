package implorganization

import (
	"encoding/json"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
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

	render.Success(rw, http.StatusNoContent, nil)
}
