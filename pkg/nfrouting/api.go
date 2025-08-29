package nfrouting

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/nfroutingtypes"
	"github.com/gorilla/mux"
)

type API struct {
	analytics    analytics.Analytics
	routeStore   nfroutingtypes.RouteStore
	alertmanager alertmanager.Alertmanager
}

// NewAPI creates a new notification routing API instance
func NewAPI(analytics analytics.Analytics, routeStore nfroutingtypes.RouteStore, alertmanager alertmanager.Alertmanager) *API {
	return &API{
		analytics:    analytics,
		routeStore:   routeStore,
		alertmanager: alertmanager,
	}
}

// CreateNotificationRoute handles POST /notification-routes
func (api *API) CreateNotificationRoute(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(w, err)
		return
	}
	var route nfroutingtypes.ExpressionRouteRequest
	if err := json.NewDecoder(r.Body).Decode(&route); err != nil {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid JSON: %v", err))
		return
	}

	if err := route.Validate(); err != nil {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid JSON: %v", err))
		return
	}

	expressionRoute := route.ToExpressionRoute(claims.OrgID, claims.UserID)

	if err := api.routeStore.Create(ctx, expressionRoute); err != nil {
		render.Error(w, fmt.Errorf("Failed to create route: %v", err))
		return
	}

	// Get current alertmanager config
	cfg, err := api.alertmanager.GetConfig(ctx, claims.OrgID)
	if err != nil {
		render.Error(w, fmt.Errorf("failed to get alertmanager config: %v", err))
		return
	}

	// Create expression routes in alertmanager config
	err = alertmanagertypes.CreateExpressionRoutes(cfg, []nfroutingtypes.ExpressionRoute{*expressionRoute})
	if err != nil {
		render.Error(w, fmt.Errorf("failed to create expression routes: %v", err))
		return
	}

	// Update alertmanager config
	err = api.alertmanager.SetConfig(ctx, cfg)
	if err != nil {
		render.Error(w, fmt.Errorf("failed to update alertmanager config: %v", err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	render.Success(w, http.StatusNoContent, nil)
}

// GetNotificationRouteByID handles GET /notification-routes/{id}
func (api *API) GetNotificationRouteByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		render.Error(w, errors.NewInvalidInputf(errors.CodeInvalidInput, "route ID is required"))
		return
	}

	route, err := api.routeStore.GetByID(ctx, id)
	if err != nil {
		render.Error(w, fmt.Errorf("Failed to get route: %v", err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(route)
}

// GetAllNotificationRoutesByOrgID handles GET /notification-routes?org_id={orgId}
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

// DeleteNotificationRouteByID handles DELETE /notification-routes/{id}
func (api *API) DeleteNotificationRouteByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims, err := authtypes.ClaimsFromContext(ctx)
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

	// Get the route before deleting to extract its details
	expressionRoute, err := api.routeStore.GetByID(ctx, id)
	if err != nil {
		render.Error(w, errors.NewNotFoundf(errors.CodeNotFound, "failed to get route: %v", err))
		return
	}

	// Delete from route store first
	if err := api.routeStore.Delete(ctx, id); err != nil {
		render.Error(w, fmt.Errorf("failed to delete route: %v", err))
		return
	}

	// Get current alertmanager config
	cfg, err := api.alertmanager.GetConfig(ctx, claims.OrgID)
	if err != nil {
		render.Error(w, fmt.Errorf("failed to get alertmanager config: %v", err))
		return
	}

	// Remove expression routes from alertmanager config
	err = alertmanagertypes.DeleteExpressionRoutes(cfg, []nfroutingtypes.ExpressionRoute{*expressionRoute})
	if err != nil {
		render.Error(w, fmt.Errorf("failed to delete expression routes: %v", err))
		return
	}

	// Update alertmanager config
	err = api.alertmanager.SetConfig(ctx, cfg)
	if err != nil {
		render.Error(w, fmt.Errorf("failed to update alertmanager config: %v", err))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
