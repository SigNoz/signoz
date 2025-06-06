package implpreference

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module preference.Module
}

func NewHandler(module preference.Module) preference.Handler {
	return &handler{module: module}
}

func (handler *handler) ListByOrg(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	preferences, err := handler.module.ListByOrg(ctx, valuer.MustNewUUID(claims.OrgID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, preferences)
}

func (handler *handler) GetByOrg(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	nameString, ok := mux.Vars(r)["name"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "name is required"))
		return
	}

	name, err := preferencetypes.NewName(nameString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	preference, err := handler.module.GetByOrg(ctx, valuer.MustNewUUID(claims.OrgID), name)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, preference)
}

func (handler *handler) UpdateByOrg(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	nameString, ok := mux.Vars(r)["name"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "name is required"))
		return
	}

	name, err := preferencetypes.NewName(nameString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(preferencetypes.UpdatablePreference)
	err = json.NewDecoder(r.Body).Decode(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.UpdateByOrg(ctx, valuer.MustNewUUID(claims.OrgID), name, req.Value)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) ListByUser(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	preferences, err := handler.module.ListByUser(ctx, valuer.MustNewUUID(claims.UserID))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, preferences)
}

func (handler *handler) GetByUser(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	nameString, ok := mux.Vars(r)["name"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "name is required"))
		return
	}

	name, err := preferencetypes.NewName(nameString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	preference, err := handler.module.GetByUser(ctx, valuer.MustNewUUID(claims.UserID), name)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, preference)
}

func (handler *handler) UpdateByUser(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	nameString, ok := mux.Vars(r)["name"]
	if !ok {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "name is required"))
		return
	}

	name, err := preferencetypes.NewName(nameString)
	if err != nil {
		render.Error(rw, err)
		return
	}

	req := new(preferencetypes.UpdatablePreference)
	err = json.NewDecoder(r.Body).Decode(req)
	if err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.module.UpdateByUser(ctx, valuer.MustNewUUID(claims.UserID), name, req.Value)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
