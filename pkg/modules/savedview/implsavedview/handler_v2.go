package implsavedview

import (
	"context"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (handler *handler) CreateV2(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	var view savedviewtypes.PostableSavedView
	if err := binding.JSON.BindBody(r.Body, &view, binding.WithDisallowUnknownFields(true)); err != nil {
		render.Error(w, err)
		return
	}
	if err := view.Validate(); err != nil {
		render.Error(w, err)
		return
	}

	uuid, err := handler.module.CreateView(ctx, claims.OrgID, view)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusCreated, types.Identifiable{ID: uuid})
}

func (handler *handler) GetV2(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	viewID := mux.Vars(r)["id"]
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

func (handler *handler) UpdateV2(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}

	viewID := mux.Vars(r)["id"]
	viewUUID, err := valuer.NewUUID(viewID)
	if err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse view id"))
		return
	}
	var view savedviewtypes.UpdatableSavedView
	if err := binding.JSON.BindBody(r.Body, &view, binding.WithDisallowUnknownFields(true)); err != nil {
		render.Error(w, err)
		return
	}
	if err := view.Validate(); err != nil {
		render.Error(w, err)
		return
	}

	err = handler.module.UpdateView(ctx, claims.OrgID, viewUUID, view)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusNoContent, nil)
}

func (handler *handler) ListV2(w http.ResponseWriter, r *http.Request) {
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

	queries, err := handler.module.GetViewsForFilters(r.Context(), claims.OrgID, params.Source, params.Name)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, queries)
}
