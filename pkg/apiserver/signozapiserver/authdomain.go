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
				TargetIDs:      authDomainRoleNamesExtractor(),
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
				SourceIDs:      coretypes.OneID(coretypes.PathParam("id")),
				SourceSelector: coretypes.IDSelector,
				TargetResource: coretypes.ResourceRole,
				TargetIDs:      authDomainRoleNamesExtractor(),
				TargetSelector: coretypes.IDSelector,
			},
			handler.AttachDetachSiblingResourceDef{
				Verb:           coretypes.VerbDetach,
				Category:       coretypes.ActionCategoryAccessControl,
				SourceResource: coretypes.ResourceMetaResourceAuthDomain,
				SourceIDs:      coretypes.OneID(coretypes.PathParam("id")),
				SourceSelector: coretypes.IDSelector,
				TargetResource: coretypes.ResourceRole,
				TargetIDs:      provider.authDomainStoredRoleNamesExtractor(),
				TargetSelector: coretypes.IDSelector,
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

// The extracted names are the roles the request body's mapping grants at SSO
// login — see authDomainEffectiveRoleNames.
func authDomainRoleNamesExtractor() coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
		roleMappingJSON := gjson.GetBytes(ec.RequestBody, "roleMapping")
		if !roleMappingJSON.Exists() || roleMappingJSON.Type == gjson.Null {
			return authDomainEffectiveRoleNames(nil), nil
		}

		roleMapping := new(authtypes.RoleMapping)
		if err := json.Unmarshal([]byte(roleMappingJSON.Raw), roleMapping); err != nil {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid role mapping: %v", err)
		}

		return authDomainEffectiveRoleNames(roleMapping), nil
	}}
}

// The extracted names are the roles the stored domain's mapping grants at SSO
// login — an update replaces that mapping, so the caller must be able to detach
// them.
func (provider *provider) authDomainStoredRoleNamesExtractor() coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(ec coretypes.ExtractorContext) ([]string, error) {
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

		return authDomainEffectiveRoleNames(authDomain.RoleMapping()), nil
	}}
}

// The effective names are the roles a domain grants at SSO login: the mapped
// roles plus the default (signoz-viewer when unset), or every role when the IDP
// role attribute is trusted. Never empty — a check with no selectors is forbidden.
func authDomainEffectiveRoleNames(roleMapping *authtypes.RoleMapping) []string {
	if roleMapping == nil {
		return []string{authtypes.SigNozViewerRoleName}
	}

	if roleMapping.UseRoleAttribute {
		return []string{coretypes.WildCardSelectorString}
	}

	roleNames := roleMapping.RoleNames()
	if !slices.Contains(roleNames, roleMapping.DefaultRoleName()) {
		roleNames = append(roleNames, roleMapping.DefaultRoleName())
	}

	return roleNames
}
