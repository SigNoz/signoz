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
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	module savedview.Module
}

func NewHandler(module savedview.Module) savedview.Handler {
	return &handler{module: module}
}

// legacyExtraData mirrors the frontend's extraData JSON shape so /api/v1
// responses can synthesize the same shape back for the legacy frontend.
type legacyExtraData struct {
	Color         string                             `json:"color,omitempty"`
	SelectColumns []telemetrytypes.TelemetryFieldKey `json:"selectColumns,omitempty"`
	Format        string                             `json:"format,omitempty"`
	MaxLines      int                                `json:"maxLines,omitempty"`
	FontSize      string                             `json:"fontSize,omitempty"`
}

func newPostableSavedViewFromLegacyView(v *v3.SavedView) savedviewtypes.PostableSavedView {
	var legacy legacyExtraData
	if v.ExtraData != "" {
		// Best-effort: malformed/older extraData shapes never fail the request
		_ = json.Unmarshal([]byte(v.ExtraData), &legacy)
	}

	return savedviewtypes.PostableSavedView{
		Name:       v.Name,
		SourcePage: savedviewtypes.SourcePage{String: valuer.NewString(v.SourcePage)},
		Data: savedviewtypes.SavedViewData{
			SchemaVersion: savedviewtypes.SavedViewSchemaVersion,
			Spec: savedviewtypes.SavedViewSpec{
				PanelType:      savedviewtypes.PanelType{String: valuer.NewString(string(v.CompositeQuery.PanelType))},
				Queries:        v.CompositeQuery.Queries,
				SelectedFields: legacy.SelectColumns,
				Display: savedviewtypes.Display{
					MaxLines: legacy.MaxLines,
					FontSize: legacy.FontSize,
					Format:   legacy.Format,
					Color:    legacy.Color,
				},
			},
		},
	}
}

func newLegacyViewFromSavedView(v *savedviewtypes.SavedView) (*v3.SavedView, error) {
	extraData, err := json.Marshal(legacyExtraData{
		Color:         v.Data.Spec.Display.Color,
		SelectColumns: v.Data.Spec.SelectedFields,
		Format:        v.Data.Spec.Display.Format,
		MaxLines:      v.Data.Spec.Display.MaxLines,
		FontSize:      v.Data.Spec.Display.FontSize,
	})
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error in marshalling extra data")
	}

	return &v3.SavedView{
		ID:         v.ID,
		Name:       v.Name,
		CreatedAt:  v.CreatedAt,
		CreatedBy:  v.CreatedBy,
		UpdatedAt:  v.UpdatedAt,
		UpdatedBy:  v.UpdatedBy,
		SourcePage: v.SourcePage.StringValue(),
		CompositeQuery: &v3.CompositeQuery{
			PanelType: v3.PanelType(v.Data.Spec.PanelType.StringValue()),
			// Saved views are only ever created from the explorer's builder mode.
			QueryType: v3.QueryTypeBuilder,
			Queries:   v.Data.Spec.Queries,
		},
		ExtraData: string(extraData),
	}, nil
}

func newLegacyViewsFromSavedViews(views []*savedviewtypes.SavedView) ([]*v3.SavedView, error) {
	out := make([]*v3.SavedView, 0, len(views))
	for _, view := range views {
		legacyView, err := newLegacyViewFromSavedView(view)
		if err != nil {
			return nil, err
		}
		out = append(out, legacyView)
	}
	return out, nil
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

	uuid, err := handler.module.CreateView(ctx, claims.OrgID, newPostableSavedViewFromLegacyView(&view))
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

	legacyView, err := newLegacyViewFromSavedView(view)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, legacyView)
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

	err = handler.module.UpdateView(ctx, claims.OrgID, viewUUID, newPostableSavedViewFromLegacyView(&view))
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

	views, err := handler.module.GetViewsForFilters(r.Context(), claims.OrgID, savedviewtypes.SourcePage{String: valuer.NewString(sourcePage)}, name)
	if err != nil {
		render.Error(w, err)
		return
	}

	legacyViews, err := newLegacyViewsFromSavedViews(views)
	if err != nil {
		render.Error(w, err)
		return
	}

	render.Success(w, http.StatusOK, legacyViews)
}
