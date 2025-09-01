package nfrouting

import (
	"encoding/json"
	"fmt"
	"github.com/SigNoz/signoz/pkg/valuer"
	"net/http"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/nfroutingtypes"
	"github.com/gorilla/mux"
)

type API struct {
	analytics    analytics.Analytics
	routeStore   nfroutingtypes.RouteStore
	routeManager *alertmanager.RouteManager
}

func NewAPI(analytics analytics.Analytics, routeStore nfroutingtypes.RouteStore, routeManager *alertmanager.RouteManager) *API {
	return &API{
		analytics:    analytics,
		routeStore:   routeStore,
		routeManager: routeManager,
	}
}

func (api *API) CreateNotificationRoute(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}
	var route nfroutingtypes.ExpressionRouteRequest
	if err := json.NewDecoder(r.Body).Decode(&route); err != nil {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}

	if err := route.Validate(); err != nil {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid request body: %v", err))
		return
	}

	expressionRoute := route.ToExpressionRoute(claims.OrgID, claims.UserID)

	routeId, err := api.routeStore.Create(ctx, expressionRoute)
	if err != nil {
		render.Error(w, fmt.Errorf("failed to create route: %v", err))
		return
	}

	expressionRoute.Identifiable.ID = routeId

	err = api.routeManager.AddNotificationPolicy(ctx, orgID.StringValue(), expressionRoute.Expression, expressionRoute.Channels, expressionRoute.ID.StringValue())
	if err != nil {
		render.Error(w, err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	render.Success(w, http.StatusOK, expressionRoute)
}

func (api *API) GetNotificationRouteByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)["id"]
	if vars == "" {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "route ID is required"))
		return
	}
	id, err := valuer.NewUUID(vars)
	if err != nil {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid route ID: %v", err))
		return
	}

	route, err := api.routeStore.GetByID(ctx, id)
	if err != nil {
		render.Error(w, fmt.Errorf("failed to get route: %v", err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	render.Success(w, http.StatusOK, route)
}

func (api *API) GetAllNotificationRoutesByOrgID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID := r.URL.Query().Get("org_id")

	if orgID == "" {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "org_id query parameter is required"))
		return
	}

	routes, err := api.routeStore.GetAllByOrgID(ctx, orgID)
	if err != nil {
		render.Error(w, fmt.Errorf("failed to get routes: %v", err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

func (api *API) DeleteNotificationRouteByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}
	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(w, err)
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "route ID is required"))
		return
	}

	if err := api.routeStore.Delete(ctx, id); err != nil {
		render.Error(w, fmt.Errorf("failed to delete route: %v", err))
		return
	}

	err = api.routeManager.DeleteNotificationPolicy(ctx, orgID.StringValue(), id)
	if err != nil {
		render.Error(w, errors.NewNotFoundf(errors.CodeNotFound, "failed to get route: %v", err))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
