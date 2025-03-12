package api

import (
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/http/render"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/types/authtypes"
)

func (ah *APIHandler) lockDashboard(w http.ResponseWriter, r *http.Request) {
	ah.lockUnlockDashboard(w, r, true)
}

func (ah *APIHandler) unlockDashboard(w http.ResponseWriter, r *http.Request) {
	ah.lockUnlockDashboard(w, r, false)
}

func (ah *APIHandler) lockUnlockDashboard(w http.ResponseWriter, r *http.Request, lock bool) {
	// Locking can only be done by the owner of the dashboard
	// or an admin

	// - Fetch the dashboard
	// - Check if the user is the owner or an admin
	// - If yes, lock/unlock the dashboard
	// - If no, return 403

	// Get the dashboard UUID from the request
	uuid := mux.Vars(r)["uuid"]
	if strings.HasPrefix(uuid, "integration") {
		render.Error(w, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "dashboards created by integrations cannot be modified"))
		return
	}

	claims, ok := authtypes.ClaimsFromContext(r.Context())
	if !ok {
		render.Error(w, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated"))
		return
	}
	dashboard, err := dashboards.GetDashboard(r.Context(), claims.OrgID, uuid)
	if err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to get dashboard"))
		return
	}

	if !auth.IsAdminV2(claims) && (dashboard.CreatedBy != claims.Email) {
		render.Error(w, errors.Newf(errors.TypeForbidden, errors.CodeForbidden, "You are not authorized to lock/unlock this dashboard"))
		return
	}

	// Lock/Unlock the dashboard
	err = dashboards.LockUnlockDashboard(r.Context(), claims.OrgID, uuid, lock)
	if err != nil {
		render.Error(w, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to lock/unlock dashboard"))
		return
	}

	ah.Respond(w, "Dashboard updated successfully")
}
