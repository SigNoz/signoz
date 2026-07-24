package implsavedview

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
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

	var view savedviewtypes.PostableSavedView
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
	var view savedviewtypes.UpdatableSavedView
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

	updated, err := handler.module.GetView(ctx, claims.OrgID, viewUUID)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, updated)
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

	params := new(savedviewtypes.ListSavedViewsParams)
	if err := binding.Query.BindQuery(r.URL.Query(), params); err != nil {
		render.Error(w, err)
		return
	}
	if err := params.Validate(); err != nil {
		render.Error(w, err)
		return
	}

	queries, err := handler.module.GetViewsForFilters(r.Context(), claims.OrgID, params.SourcePage, params.Name)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, queries)
}
