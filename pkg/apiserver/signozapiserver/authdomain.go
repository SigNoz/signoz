package signozapiserver

import (
	"encoding/json"
	"net/http"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/tidwall/gjson"
)

func (provider *provider) addAuthDomainRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v2/auth_domains", handler.New(
		provider.authzMiddleware.CheckResources(provider.authDomainHandler.List, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "ListAuthDomains",
			Tags:                []string{"authdomains"},
			Summary:             "List all auth domains",
			Description:         "This endpoint lists all auth domains",
			Request:             nil,
			RequestContentType:  "",
			Response:            make([]*authtypes.GettableAuthDomain, 0),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceAuthDomain,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryAccessControl,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/auth_domains", handler.New(
		provider.authzMiddleware.CheckResources(provider.authDomainHandler.Create, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateAuthDomain",
			Tags:                []string{"authdomains"},
			Summary:             "Create auth domain",
			Description:         "This endpoint creates an auth domain",
			Request:             new(authtypes.PostableAuthDomain),
			RequestContentType:  "application/json",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes: newScopedSecuritySchemes([]string{
				coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbCreate),
				coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbAttach),
				coretypes.ResourceRole.Scope(coretypes.VerbAttach),
			}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceAuthDomain,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryAccessControl,
				ID:       coretypes.ResponseJSONPath("data.id"),
				Selector: coretypes.WildcardSelector,
			},
			handler.AttachDetachSiblingResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryAccessControl,
				SourceResource: coretypes.ResourceMetaResourceAuthDomain,
				SourceIDs:      coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
				SourceSelector: coretypes.WildcardSelector,
				TargetResource: coretypes.ResourceRole,
				TargetIDs:      provider.authDomainRoleNamesExtractor(),
				TargetSelector: coretypes.IDSelector,
			},
		),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/auth_domains/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.authDomainHandler.Get, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetAuthDomain",
			Tags:                []string{"authdomains"},
			Summary:             "Get auth domain by ID",
			Description:         "This endpoint returns an auth domain by ID",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(authtypes.GettableAuthDomain),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceAuthDomain,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/auth_domains/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.authDomainHandler.Update, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateAuthDomain",
			Tags:                []string{"authdomains"},
			Summary:             "Update auth domain",
			Description:         "This endpoint updates an auth domain",
			Request:             new(authtypes.UpdatableAuthDomain),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes: newScopedSecuritySchemes([]string{
				coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbUpdate),
				coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbAttach),
				coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbDetach),
				coretypes.ResourceRole.Scope(coretypes.VerbAttach),
				coretypes.ResourceRole.Scope(coretypes.VerbDetach),
			}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceAuthDomain,
				Verb:     coretypes.VerbUpdate,
				Category: coretypes.ActionCategoryAccessControl,
				ID:       coretypes.PathParam("id"),
				Selector: coretypes.IDSelector,
			},
			handler.AttachDetachSiblingResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryAccessControl,
				SourceResource: coretypes.ResourceMetaResourceAuthDomain,
				SourceIDs:      provider.authDomainIDWhenRolesChangeExtractor(provider.authDomainAttachedRoleNames),
				SourceSelector: coretypes.IDSelector,
				TargetResource: coretypes.ResourceRole,
				TargetIDs:      coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: provider.authDomainAttachedRoleNames},
				TargetSelector: coretypes.IDSelector,
				SkipIfNoIDs:    true,
			},
			handler.AttachDetachSiblingResourceDef{
				Verb:           coretypes.VerbDetach,
				Category:       coretypes.ActionCategoryAccessControl,
				SourceResource: coretypes.ResourceMetaResourceAuthDomain,
				SourceIDs:      provider.authDomainIDWhenRolesChangeExtractor(provider.authDomainDetachedRoleNames),
				SourceSelector: coretypes.IDSelector,
				TargetResource: coretypes.ResourceRole,
				TargetIDs:      coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: provider.authDomainDetachedRoleNames},
				TargetSelector: coretypes.IDSelector,
				SkipIfNoIDs:    true,
			},
		),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v2/auth_domains/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.authDomainHandler.Delete, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteAuthDomain",
			Tags:                []string{"authdomains"},
			Summary:             "Delete auth domain",
			Description:         "This endpoint deletes an auth domain",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceAuthDomain,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

func (provider *provider) authDomainRoleNamesExtractor() coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: provider.authDomainRequestEffectiveRoleNames}
}

func (provider *provider) authDomainIDWhenRolesChangeExtractor(roleNamesDiff func(coretypes.ExtractorContext) ([]string, error)) coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		diff, err := roleNamesDiff(ec)
		if err != nil {
			return nil, err
		}

		if len(diff) == 0 || ec.Request == nil {
			return nil, nil
		}

		return []string{mux.Vars(ec.Request)["id"]}, nil
	}}
}

func (provider *provider) authDomainAttachedRoleNames(ec coretypes.ExtractorContext) ([]string, error) {
	requestRoleNames, err := provider.authDomainRequestEffectiveRoleNames(ec)
	if err != nil {
		return nil, err
	}

	storedRoleNames, err := provider.authDomainStoredEffectiveRoleNames(ec)
	if err != nil {
		return nil, err
	}

	return provider.subtractRoleNames(requestRoleNames, storedRoleNames), nil
}

func (provider *provider) authDomainDetachedRoleNames(ec coretypes.ExtractorContext) ([]string, error) {
	requestRoleNames, err := provider.authDomainRequestEffectiveRoleNames(ec)
	if err != nil {
		return nil, err
	}

	storedRoleNames, err := provider.authDomainStoredEffectiveRoleNames(ec)
	if err != nil {
		return nil, err
	}

	return provider.subtractRoleNames(storedRoleNames, requestRoleNames), nil
}

func (provider *provider) authDomainRequestEffectiveRoleNames(ec coretypes.ExtractorContext) ([]string, error) {
	roleMappingJSON := gjson.GetBytes(ec.RequestBody, "roleMapping")
	if !roleMappingJSON.Exists() || roleMappingJSON.Type == gjson.Null {
		return provider.authDomainEffectiveRoleNames(nil), nil
	}

	roleMapping := new(authtypes.RoleMapping)
	if err := json.Unmarshal([]byte(roleMappingJSON.Raw), roleMapping); err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid role mapping: %v", err)
	}

	return provider.authDomainEffectiveRoleNames(roleMapping), nil
}

func (provider *provider) authDomainStoredEffectiveRoleNames(ec coretypes.ExtractorContext) ([]string, error) {
	if ec.Request == nil {
		return nil, nil
	}

	claims, err := authtypes.ClaimsFromContext(ec.Request.Context())
	if err != nil {
		return nil, err
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		return nil, err
	}

	id, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
	if err != nil {
		return nil, err
	}

	authDomain, err := provider.authDomainModule.GetByOrgIDAndID(ec.Request.Context(), orgID, id)
	if err != nil {
		return nil, err
	}

	return provider.authDomainEffectiveRoleNames(authDomain.RoleMapping()), nil
}

func (provider *provider) subtractRoleNames(roleNames []string, roleNamesToRemove []string) []string {
	removeSet := make(map[string]struct{}, len(roleNamesToRemove))
	for _, roleName := range roleNamesToRemove {
		removeSet[roleName] = struct{}{}
	}

	remaining := make([]string, 0, len(roleNames))
	for _, roleName := range roleNames {
		if _, ok := removeSet[roleName]; !ok {
			remaining = append(remaining, roleName)
		}
	}

	return remaining
}

// Never empty — a check with no selectors is forbidden.
func (provider *provider) authDomainEffectiveRoleNames(roleMapping *authtypes.RoleMapping) []string {
	if roleMapping == nil {
		return []string{authtypes.SigNozViewerRoleName}
	}

	if roleMapping.UseRoleAttribute {
		return []string{coretypes.WildCardSelectorString, authtypes.SigNozViewerRoleName}
	}

	roleNames := roleMapping.RoleNames()
	if !slices.Contains(roleNames, roleMapping.DefaultRoleName()) {
		roleNames = append(roleNames, roleMapping.DefaultRoleName())
	}

	return roleNames
}
