package signozapiserver

import (
	"net/http"

	"github.com/gorilla/mux"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
)

func (provider *provider) addSystemDashboardRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/system/{source}", handler.New(provider.authZ.ViewAccess(provider.systemDashboardHandler.Get), handler.OpenAPIDef{
		ID:                  "GetSystemDashboard",
		Tags:                []string{"systemdashboard"},
		Summary:             "Get system dashboard",
		Description:         "This endpoint returns the system dashboard for the callers org keyed by source (e.g. ai-o11y-overview).",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(dashboardtypes.GettableDashboard),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/system/{source}", handler.New(provider.authZ.EditAccess(provider.systemDashboardHandler.Update), handler.OpenAPIDef{
		ID:                  "UpdateSystemDashboard",
		Tags:                []string{"systemdashboard"},
		Summary:             "Update system dashboard",
		Description:         "This endpoint replaces the system dashboard for the callers org with the provided payload.",
		Request:             new(dashboardtypes.UpdatableDashboard),
		RequestContentType:  "application/json",
		Response:            new(dashboardtypes.GettableDashboard),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/system/{source}/reset", handler.New(provider.authZ.EditAccess(provider.systemDashboardHandler.Reset), handler.OpenAPIDef{
		ID:                  "ResetSystemDashboard",
		Tags:                []string{"systemdashboard"},
		Summary:             "Reset system dashboard to defaults",
		Description:         "This resets edited/updated system dashboard to default system dashboard.",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(dashboardtypes.GettableDashboard),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}
