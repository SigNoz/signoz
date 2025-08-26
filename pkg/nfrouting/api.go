package nfrouting

import (
	"encoding/json"
	"fmt"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"net/http"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/types/routingtypes"
	"github.com/gorilla/mux"
)

type API struct {
	analytics  analytics.Analytics
	routeStore routingtypes.RouteStore
}

// NewAPI creates a new notification routing API instance
func NewAPI(analytics analytics.Analytics, routeStore routingtypes.RouteStore) *API {
	return &API{
		analytics:  analytics,
		routeStore: routeStore,
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
	var route routingtypes.ExpressionRouteRequest
	if err := json.NewDecoder(r.Body).Decode(&route); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	if err := route.Validate(); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
	}

	if err := api.routeStore.Create(ctx, route.ToExpressionRoute(claims.OrgID, claims.UserID)); err != nil {
		http.Error(w, fmt.Sprintf("Failed to create route: %v", err), http.StatusInternalServerError)
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
		http.Error(w, "Route ID is required", http.StatusBadRequest)
		return
	}

	route, err := api.routeStore.GetByID(ctx, id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get route: %v", err), http.StatusInternalServerError)
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
		http.Error(w, "org_id query parameter is required", http.StatusBadRequest)
		return
	}

	routes, err := api.routeStore.GetAllByOrgID(ctx, orgID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get routes: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(routes)
}

// DeleteNotificationRouteByID handles DELETE /notification-routes/{id}
func (api *API) DeleteNotificationRouteByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		http.Error(w, "Route ID is required", http.StatusBadRequest)
		return
	}

	// Check if route exists before deleting
	_, err := api.routeStore.GetByID(ctx, id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to check route: %v", err), http.StatusInternalServerError)
	}
	return
}
