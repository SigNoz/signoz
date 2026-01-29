package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addRoleRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/roles", handler.New(provider.authZ.AdminAccess(provider.roleHandler.Create), handler.OpenAPIDef{
		ID:                  "CreateRole",
		Tags:                []string{"role"},
		Summary:             "Create role",
		Description:         "This endpoint creates a role",
		Request:             nil,
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

	if err := router.Handle("/api/v1/roles", handler.New(provider.authZ.AdminAccess(provider.roleHandler.List), handler.OpenAPIDef{
		ID:                  "ListRoles",
		Tags:                []string{"role"},
		Summary:             "List roles",
		Description:         "This endpoint lists all roles",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*roletypes.Role, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authZ.AdminAccess(provider.roleHandler.Get), handler.OpenAPIDef{
		ID:                  "GetRole",
		Tags:                []string{"role"},
		Summary:             "Get role",
		Description:         "This endpoint gets a role",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(roletypes.Role),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authZ.AdminAccess(provider.roleHandler.Patch), handler.OpenAPIDef{
		ID:                  "PatchRole",
		Tags:                []string{"role"},
		Summary:             "Patch role",
		Description:         "This endpoint patches a role",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authZ.AdminAccess(provider.roleHandler.Delete), handler.OpenAPIDef{
		ID:                  "DeleteRole",
		Tags:                []string{"role"},
		Summary:             "Delete role",
		Description:         "This endpoint deletes a role",
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

	return nil
}
