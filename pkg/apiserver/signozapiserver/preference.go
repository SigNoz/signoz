package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/preferencetypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addPreferenceRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/user/preferences", handler.New(provider.authZ.ViewAccess(provider.preferenceHandler.ListByUser), handler.OpenAPIDef{
		ID:                  "ListUserPreferences",
		Tags:                []string{"preferences"},
		Summary:             "List user preferences",
		Description:         "This endpoint lists all user preferences",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*preferencetypes.Preference, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/preferences/{name}", handler.New(provider.authZ.ViewAccess(provider.preferenceHandler.GetByUser), handler.OpenAPIDef{
		ID:                  "GetUserPreference",
		Tags:                []string{"preferences"},
		Summary:             "Get user preference",
		Description:         "This endpoint returns the user preference by name",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(preferencetypes.Preference),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/user/preferences/{name}", handler.New(provider.authZ.ViewAccess(provider.preferenceHandler.UpdateByUser), handler.OpenAPIDef{
		ID:                  "UpdateUserPreference",
		Tags:                []string{"preferences"},
		Summary:             "Update user preference",
		Description:         "This endpoint updates the user preference by name",
		Request:             new(preferencetypes.UpdatablePreference),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/org/preferences", handler.New(provider.authZ.AdminAccess(provider.preferenceHandler.ListByOrg), handler.OpenAPIDef{
		ID:                  "ListOrgPreferences",
		Tags:                []string{"preferences"},
		Summary:             "List org preferences",
		Description:         "This endpoint lists all org preferences",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*preferencetypes.Preference, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/org/preferences/{name}", handler.New(provider.authZ.AdminAccess(provider.preferenceHandler.GetByOrg), handler.OpenAPIDef{
		ID:                  "GetOrgPreference",
		Tags:                []string{"preferences"},
		Summary:             "Get org preference",
		Description:         "This endpoint returns the org preference by name",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(preferencetypes.Preference),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/org/preferences/{name}", handler.New(provider.authZ.AdminAccess(provider.preferenceHandler.UpdateByOrg), handler.OpenAPIDef{
		ID:                  "UpdateOrgPreference",
		Tags:                []string{"preferences"},
		Summary:             "Update org preference",
		Description:         "This endpoint updates the org preference by name",
		Request:             new(preferencetypes.UpdatablePreference),
		RequestContentType:  "application/json",
		Response:            nil,
		ResponseContentType: "",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	return nil
}
