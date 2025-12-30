package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addDashboardRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/global/config", handler.New(provider.authZ.EditAccess(provider.globalHandler.GetConfig), handler.OpenAPIDef{
		ID:                  "GetGlobalConfig",
		Tags:                []string{"global"},
		Summary:             "Get global config",
		Description:         "This endpoints returns global config",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.GettableGlobalConfig),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authZ.AdminAccess(provider.dashboardHandler.CreatePublic), handler.OpenAPIDef{
		ID:                  "GetGlobalConfig",
		Tags:                []string{"global"},
		Summary:             "Get global config",
		Description:         "This endpoints returns global config",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.GettableGlobalConfig),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authZ.AdminAccess(provider.dashboardHandler.GetPublic), handler.OpenAPIDef{
		ID:                  "GetGlobalConfig",
		Tags:                []string{"global"},
		Summary:             "Get global config",
		Description:         "This endpoints returns global config",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.GettableGlobalConfig),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authZ.AdminAccess(provider.dashboardHandler.UpdatePublic), handler.OpenAPIDef{
		ID:                  "GetGlobalConfig",
		Tags:                []string{"global"},
		Summary:             "Get global config",
		Description:         "This endpoints returns global config",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.GettableGlobalConfig),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/dashboards/{id}/public", handler.New(provider.authZ.AdminAccess(provider.dashboardHandler.DeletePublic), handler.OpenAPIDef{
		ID:                  "GetGlobalConfig",
		Tags:                []string{"global"},
		Summary:             "Get global config",
		Description:         "This endpoints returns global config",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.GettableGlobalConfig),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/public/dashboards/{id}", handler.New(provider.authZ.CheckWithoutClaims(
		provider.dashboardHandler.GetPublicData,
		authtypes.RelationRead, authtypes.RelationRead,
		dashboardtypes.TypeableMetaResourcePublicDashboard,
		func(req *http.Request, orgs []*types.Organization) ([]authtypes.Selector, valuer.UUID, error) {
			id, err := valuer.NewUUID(mux.Vars(req)["id"])
			if err != nil {
				return nil, valuer.UUID{}, err
			}

			return provider.dashboardModule.GetPublicDashboardSelectorsAndOrg(req.Context(), id, orgs)
		}), handler.OpenAPIDef{
		ID:                  "GetGlobalConfig",
		Tags:                []string{"global"},
		Summary:             "Get global config",
		Description:         "This endpoints returns global config",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.GettableGlobalConfig),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/public/dashboards/{id}/widgets/{idx}/query_range", handler.New(provider.authZ.CheckWithoutClaims(
		provider.dashboardHandler.GetPublicWidgetQueryRange,
		authtypes.RelationRead, authtypes.RelationRead,
		dashboardtypes.TypeableMetaResourcePublicDashboard,
		func(req *http.Request, orgs []*types.Organization) ([]authtypes.Selector, valuer.UUID, error) {
			id, err := valuer.NewUUID(mux.Vars(req)["id"])
			if err != nil {
				return nil, valuer.UUID{}, err
			}

			return provider.dashboardModule.GetPublicDashboardSelectorsAndOrg(req.Context(), id, orgs)
		}), handler.OpenAPIDef{
		ID:                  "GetGlobalConfig",
		Tags:                []string{"global"},
		Summary:             "Get global config",
		Description:         "This endpoints returns global config",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(types.GettableGlobalConfig),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}
