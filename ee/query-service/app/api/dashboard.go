package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/model"
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
	if strings.HasPrefix(uuid,"integration") {
		RespondError(w, &model.ApiError{Typ: model.ErrorForbidden, Err: errors.New("dashboards created by integrations cannot be unlocked")}, "You are not authorized to lock/unlock this dashboard")
		return 
	}
	dashboard, err := dashboards.GetDashboard(r.Context(), uuid)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, err.Error())
		return
	}

	user := common.GetUserFromContext(r.Context())
	if !auth.IsAdmin(user) && (dashboard.CreateBy != nil && *dashboard.CreateBy != user.Email) {
		RespondError(w, &model.ApiError{Typ: model.ErrorForbidden, Err: err}, "You are not authorized to lock/unlock this dashboard")
		return
	}

	// Lock/Unlock the dashboard
	err = dashboards.LockUnlockDashboard(r.Context(), uuid, lock)
	if err != nil {
		RespondError(w, &model.ApiError{Typ: model.ErrorInternal, Err: err}, err.Error())
		return
	}

	ah.Respond(w, "Dashboard updated successfully")
}
