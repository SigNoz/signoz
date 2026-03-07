package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addDashboardRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authZ.AdminAccess(provider.dashboardHandler.CreatePublic), handler.OpenAPIDef{
		ID:                  "CreatePublicDashboard",
		Tags:                []string{"dashboard"},
		Summary:             "Create public dashboard",
		Description:         "This endpoint creates public sharing config and enables public sharing of the dashboard",
		Request:             new(dashboardtypes.PostablePublicDashboard),
		RequestContentType:  "",
		Response:            new(types.Identifiable),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authZ.AdminAccess(provider.dashboardHandler.GetPublic), handler.OpenAPIDef{
		ID:                  "GetPublicDashboard",
		Tags:                []string{"dashboard"},
		Summary:             "Get public dashboard",
		Description:         "This endpoint returns public sharing config for a dashboard",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(dashboardtypes.GettablePublicDasbhboard),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authZ.AdminAccess(provider.dashboardHandler.UpdatePublic), handler.OpenAPIDef{
		ID:                  "UpdatePublicDashboard",
		Tags:                []string{"dashboard"},
		Summary:             "Update public dashboard",
		Description:         "This endpoint updates the public sharing config for a dashboard",
		Request:             new(dashboardtypes.UpdatablePublicDashboard),
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authZ.AdminAccess(provider.dashboardHandler.DeletePublic), handler.OpenAPIDef{
		ID:                  "DeletePublicDashboard",
		Tags:                []string{"dashboard"},
		Summary:             "Delete public dashboard",
		Description:         "This endpoint deletes the public sharing config and disables the public sharing of a dashboard",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/public/dashboards/{id}", handler.New(provider.authZ.CheckWithoutClaims(
		provider.dashboardHandler.GetPublicData,
		authtypes.RelationRead,
		dashboardtypes.TypeableMetaResourcePublicDashboard,
		func(req *http.Request, orgs []*types.Organization) ([]authtypes.Selector, valuer.UUID, error) {
			id, err := valuer.NewUUID(mux.Vars(req)["id"])
			if err != nil {
				return nil, valuer.UUID{}, err
			}

			return provider.dashboardModule.GetPublicDashboardSelectorsAndOrg(req.Context(), id, orgs)
		}, []string{}), handler.OpenAPIDef{
		ID:                  "GetPublicDashboardData",
		Tags:                []string{"dashboard"},
		Summary:             "Get public dashboard data",
		Description:         "This endpoint returns the sanitized dashboard data for public access",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(dashboardtypes.GettablePublicDashboardData),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newAnonymousSecuritySchemes([]string{dashboardtypes.TypeableMetaResourcePublicDashboard.Scope(authtypes.RelationRead)}),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/public/dashboards/{id}/widgets/{idx}/query_range", handler.New(provider.authZ.CheckWithoutClaims(
		provider.dashboardHandler.GetPublicWidgetQueryRange,
		authtypes.RelationRead,
		dashboardtypes.TypeableMetaResourcePublicDashboard,
		func(req *http.Request, orgs []*types.Organization) ([]authtypes.Selector, valuer.UUID, error) {
			id, err := valuer.NewUUID(mux.Vars(req)["id"])
			if err != nil {
				return nil, valuer.UUID{}, err
			}

			return provider.dashboardModule.GetPublicDashboardSelectorsAndOrg(req.Context(), id, orgs)
		}, []string{}), handler.OpenAPIDef{
		ID:                  "GetPublicDashboardWidgetQueryRange",
		Tags:                []string{"dashboard"},
		Summary:             "Get query range result",
		Description:         "This endpoint return query range results for a widget of public dashboard",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(querybuildertypesv5.QueryRangeResponse),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newAnonymousSecuritySchemes([]string{dashboardtypes.TypeableMetaResourcePublicDashboard.Scope(authtypes.RelationRead)}),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	return nil
}
