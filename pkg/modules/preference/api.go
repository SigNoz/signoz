package preference

import (
	"encoding/json"
	"net/http"

	errorsV2 "github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/gorilla/mux"
)

type API interface {
	GetOrgPreference(http.ResponseWriter, *http.Request)
	UpdateOrgPreference(http.ResponseWriter, *http.Request)
	GetAllOrgPreferences(http.ResponseWriter, *http.Request)

	GetUserPreference(http.ResponseWriter, *http.Request)
	UpdateUserPreference(http.ResponseWriter, *http.Request)
	GetAllUserPreferences(http.ResponseWriter, *http.Request)
}

type preferenceAPI struct {
	usecase Usecase
}

func NewAPI(usecase Usecase) API {
	return &preferenceAPI{usecase: usecase}
}

func (p *preferenceAPI) GetOrgPreference(rw http.ResponseWriter, r *http.Request) {
	preferenceId := mux.Vars(r)["preferenceId"]
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}
	preference, err := p.usecase.GetOrgPreference(
		r.Context(), preferenceId, claims.OrgID,
	)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, preference)
}

func (p *preferenceAPI) UpdateOrgPreference(rw http.ResponseWriter, r *http.Request) {
	preferenceId := mux.Vars(r)["preferenceId"]
	req := preferencetypes.UpdatablePreference{}
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {
		render.Error(rw, err)
		return
	}
	err = p.usecase.UpdateOrgPreference(r.Context(), preferenceId, req.PreferenceValue, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (p *preferenceAPI) GetAllOrgPreferences(rw http.ResponseWriter, r *http.Request) {
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}
	preferences, err := p.usecase.GetAllOrgPreferences(
		r.Context(), claims.OrgID,
	)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, preferences)
}

func (p *preferenceAPI) GetUserPreference(rw http.ResponseWriter, r *http.Request) {
	preferenceId := mux.Vars(r)["preferenceId"]
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}

	preference, err := p.usecase.GetUserPreference(
		r.Context(), preferenceId, claims.OrgID, claims.UserID,
	)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, preference)
}

func (p *preferenceAPI) UpdateUserPreference(rw http.ResponseWriter, r *http.Request) {
	preferenceId := mux.Vars(r)["preferenceId"]
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}
	req := preferencetypes.UpdatablePreference{}

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {
		render.Error(rw, err)
		return
	}
	err = p.usecase.UpdateUserPreference(r.Context(), preferenceId, req.PreferenceValue, claims.UserID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (p *preferenceAPI) GetAllUserPreferences(rw http.ResponseWriter, r *http.Request) {
	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(rw, errorsV2.Newf(errorsV2.TypeUnauthenticated, errorsV2.CodeUnauthenticated, "unauthenticated"))
		return
	}
	preferences, err := p.usecase.GetAllUserPreferences(
		r.Context(), claims.OrgID, claims.UserID,
	)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, preferences)
}
