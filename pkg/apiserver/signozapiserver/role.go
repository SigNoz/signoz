package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addRoleRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/roles", handler.New(provider.authzMiddleware.Check(provider.authzHandler.Create, authtypes.Relation{Verb: coretypes.VerbCreate}, coretypes.ResourceRole, roleCollectionSelectorCallback, []string{
		authtypes.SigNozAdminRoleName,
	}), handler.OpenAPIDef{
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
	})).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles", handler.New(provider.authzMiddleware.Check(provider.authzHandler.List, authtypes.Relation{Verb: coretypes.VerbList}, coretypes.ResourceRole, roleCollectionSelectorCallback, []string{
		authtypes.SigNozAdminRoleName,
	}), handler.OpenAPIDef{
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
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authzMiddleware.Check(provider.authzHandler.Get, authtypes.Relation{Verb: coretypes.VerbRead}, coretypes.ResourceRole, provider.roleInstanceSelectorCallback, []string{
		authtypes.SigNozAdminRoleName,
	}), handler.OpenAPIDef{
		ID:                  "GetRole",
		Tags:                []string{"role"},
		Summary:             "Get role",
		Description:         "This endpoint gets a role",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(authtypes.Role),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{},
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbRead)}),
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}/relations/{relation}/objects", handler.New(provider.authzMiddleware.Check(provider.authzHandler.GetObjects, authtypes.Relation{Verb: coretypes.VerbRead}, coretypes.ResourceRole, provider.roleInstanceSelectorCallback, []string{
		authtypes.SigNozAdminRoleName,
	}), handler.OpenAPIDef{
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
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authzMiddleware.Check(provider.authzHandler.Patch, authtypes.Relation{Verb: coretypes.VerbUpdate}, coretypes.ResourceRole, provider.roleInstanceSelectorCallback, []string{
		authtypes.SigNozAdminRoleName,
	}), handler.OpenAPIDef{
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
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbUpdate)}),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}/relations/{relation}/objects", handler.New(provider.authzMiddleware.Check(provider.authzHandler.PatchObjects, authtypes.Relation{Verb: coretypes.VerbUpdate}, coretypes.ResourceRole, provider.roleInstanceSelectorCallback, []string{
		authtypes.SigNozAdminRoleName,
	}), handler.OpenAPIDef{
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
		Deprecated:          false,
		SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceRole.Scope(coretypes.VerbUpdate)}),
	})).Methods(http.MethodPatch).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/roles/{id}", handler.New(provider.authzMiddleware.Check(provider.authzHandler.Delete, authtypes.Relation{Verb: coretypes.VerbDelete}, coretypes.ResourceRole, provider.roleInstanceSelectorCallback, []string{
		authtypes.SigNozAdminRoleName,
	}), handler.OpenAPIDef{
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
	})).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

func roleCollectionSelectorCallback(_ *http.Request, _ authtypes.Claims) ([]coretypes.Selector, error) {
	return []coretypes.Selector{
		coretypes.TypeRole.MustSelector(coretypes.WildCardSelectorString),
	}, nil
}

func (provider *provider) roleInstanceSelectorCallback(req *http.Request, claims authtypes.Claims) ([]coretypes.Selector, error) {
	roleID, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		return nil, err
	}

	role, err := provider.authzService.Get(req.Context(), valuer.MustNewUUID(claims.OrgID), roleID)
	if err != nil {
		return nil, err
	}

	return []coretypes.Selector{
		coretypes.TypeRole.MustSelector(role.Name),
		coretypes.TypeRole.MustSelector(coretypes.WildCardSelectorString),
	}, nil
}
