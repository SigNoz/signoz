package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/roletypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addRoleRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/roles", handler.New(provider.authZ.AdminAccess(provider.authzHandler.Create), handler.OpenAPIDef{
		ID:                  "CreateRole",
		Tags:                []string{"role"},
		Summary:             "Create role",
		Description:         "This endpoint creates a role",
		Request:             new(roletypes.PostableRole),
		RequestContentType:  "",
		Response:            new(types.Identifiable),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusCreated,
		ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles", handler.New(provider.authZ.AdminAccess(provider.authzHandler.List), handler.OpenAPIDef{
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

	if err := router.Handle("/api/v1/roles/resources", handler.New(provider.authZ.AdminAccess(provider.authzHandler.GetResources), handler.OpenAPIDef{
		ID:                  "GetResources",
		Tags:                []string{"role"},
		Summary:             "Get resources",
		Description:         "Gets all the available resources for role assignment",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(roletypes.GettableResources),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authZ.AdminAccess(provider.authzHandler.Get), handler.OpenAPIDef{
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

	if err := router.Handle("/api/v1/roles/{id}/relation/{relation}/objects", handler.New(provider.authZ.AdminAccess(provider.authzHandler.GetObjects), handler.OpenAPIDef{
		ID:                  "GetObjects",
		Tags:                []string{"role"},
		Summary:             "Get objects for a role by relation",
		Description:         "Gets all objects connected to the specified role via a given relation type",
		Request:             nil,
		RequestContentType:  "",
		Response:            make([]*authtypes.Object, 0),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authZ.AdminAccess(provider.authzHandler.Patch), handler.OpenAPIDef{
		ID:                  "PatchRole",
		Tags:                []string{"role"},
		Summary:             "Patch role",
		Description:         "This endpoint patches a role",
		Request:             new(roletypes.PatchableRole),
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}/relation/{relation}/objects", handler.New(provider.authZ.AdminAccess(provider.authzHandler.PatchObjects), handler.OpenAPIDef{
		ID:                  "PatchObjects",
		Tags:                []string{"role"},
		Summary:             "Patch objects for a role by relation",
		Description:         "Patches the objects connected to the specified role via a given relation type",
		Request:             new(roletypes.PatchableObjects),
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusBadRequest, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authZ.AdminAccess(provider.authzHandler.Delete), handler.OpenAPIDef{
		ID:                  "DeleteRole",
		Tags:                []string{"role"},
		Summary:             "Delete role",
		Description:         "This endpoint deletes a role",
		Request:             nil,
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
		Deprecated:          false,
		SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}
