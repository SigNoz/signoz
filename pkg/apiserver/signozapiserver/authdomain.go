package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceAuthDomain,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
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
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceAuthDomain.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceAuthDomain,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
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
