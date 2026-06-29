package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addRoleRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/roles", handler.New(
		provider.authzMiddleware.CheckResources(provider.authzHandler.Create, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateRole",
			Tags:                []string{"role"},
			Summary:             "Create role",
			Description:         "This endpoint creates a role",
			Request:             new(authtypes.PostableRole),
			RequestContentType:  "",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles", handler.New(
		provider.authzMiddleware.CheckResources(provider.authzHandler.List, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "ListRoles",
			Tags:                []string{"role"},
			Summary:             "List roles",
			Description:         "This endpoint lists all roles",
			Request:             nil,
			RequestContentType:  "",
			Response:            make([]*authtypes.Role, 0),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryAccessControl,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.authzHandler.Get, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetRole",
			Tags:                []string{"role"},
			Summary:             "Get role",
			Description:         "This endpoint gets a role",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(authtypes.RoleWithTransactionGroups),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: provider.roleSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.authzHandler.Update, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateRole",
			Tags:                []string{"role"},
			Summary:             "Update role",
			Description:         "This endpoint updates a role",
			Request:             new(authtypes.UpdatableRole),
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: provider.roleSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.authzHandler.Delete, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: provider.roleSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}/relations/{relation}/objects", handler.New(
		provider.authzMiddleware.CheckResources(provider.authzHandler.GetObjects, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetObjects",
			Tags:                []string{"role"},
			Summary:             "Get objects for a role by relation",
			Description:         "Gets all objects connected to the specified role via a given relation type",
			Request:             nil,
			RequestContentType:  "",
			Response:            make([]*coretypes.ObjectGroup, 0),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: provider.roleSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.authzHandler.Patch, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "PatchRole",
			Tags:                []string{"role"},
			Summary:             "Patch role",
			Description:         "This endpoint patches a role",
			Request:             new(authtypes.PatchableRole),
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: provider.roleSelector,
		}),
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}/relations/{relation}/objects", handler.New(
		provider.authzMiddleware.CheckResources(provider.authzHandler.PatchObjects, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "PatchObjects",
			Tags:                []string{"role"},
			Summary:             "Patch objects for a role by relation",
			Description:         "Patches the objects connected to the specified role via a given relation type",
			Request:             new(coretypes.PatchableObjects),
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusBadRequest, http.StatusNotImplemented, http.StatusUnavailableForLegalReasons},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: provider.roleSelector,
		}),
	)).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	return nil
}
