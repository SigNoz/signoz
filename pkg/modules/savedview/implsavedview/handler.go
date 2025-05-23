package implsavedview

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module savedview.Module
}

func NewHandler(module savedview.Module) savedview.Handler {
	return &handler{module: module}
}

func (handler *handler) Create(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	var view v3.SavedView
	if err := json.NewDecoder(r.Body).Decode(&view); err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to decode request body"))
		return
	}
	// validate the query
	if err := view.Validate(); err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to validate request body"))
		return
	}

	uuid, err := handler.module.CreateView(ctx, claims.OrgID, view)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, uuid)
}

func (handler *handler) Get(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	viewID := mux.Vars(r)["viewId"]
	viewUUID, err := valuer.NewUUID(viewID)
	if err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse view id"))
		return
	}

	view, err := handler.module.GetView(ctx, claims.OrgID, viewUUID)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, view)
}

func (handler *handler) Update(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	viewID := mux.Vars(r)["viewId"]
	viewUUID, err := valuer.NewUUID(viewID)
	if err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse view id"))
		return
	}
	var view v3.SavedView
	if err := json.NewDecoder(r.Body).Decode(&view); err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to decode request body"))
		return
	}
	// validate the query
	if err := view.Validate(); err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to validate request body"))
		return
	}

	err = handler.module.UpdateView(ctx, claims.OrgID, viewUUID, view)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, view)
}

func (handler *handler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	viewID := mux.Vars(r)["viewId"]
	viewUUID, err := valuer.NewUUID(viewID)
	if err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse view id"))
		return
	}

	err = handler.module.DeleteView(ctx, claims.OrgID, viewUUID)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, nil)
}

func (handler *handler) List(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	sourcePage := r.URL.Query().Get("sourcePage")
	name := r.URL.Query().Get("name")
	category := r.URL.Query().Get("category")

	queries, err := handler.module.GetViewsForFilters(r.Context(), claims.OrgID, sourcePage, name, category)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, queries)
}
