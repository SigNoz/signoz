package signozapiserver

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/audittypes"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (provider *provider) addServiceAccountRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/service_accounts", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.Create, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateServiceAccount",
			Tags:                []string{"serviceaccount"},
			Summary:             "Create service account",
			Description:         "This endpoint creates a service account",
			Request:             new(serviceaccounttypes.PostableServiceAccount),
			RequestContentType:  "",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.ResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbCreate,
			ID:       handler.ResponseJSONPath("data.id"),
			Selector: handler.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.List, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "ListServiceAccounts",
			Tags:                []string{"serviceaccount"},
			Summary:             "List service accounts",
			Description:         "This endpoint lists the service accounts for an organisation",
			Request:             nil,
			RequestContentType:  "",
			Response:            make([]*serviceaccounttypes.ServiceAccount, 0),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.ResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbList,
			Selector: handler.WildcardSelector,
			Category: audittypes.ActionCategoryAccessControl,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/me", handler.New(provider.authzMiddleware.OpenAccess(provider.serviceAccountHandler.GetMe), handler.OpenAPIDef{
		ID:                  "GetMyServiceAccount",
		Tags:                []string{"serviceaccount"},
		Summary:             "Gets my service account",
		Description:         "This endpoint gets my service account",
		Request:             nil,
		RequestContentType:  "",
		Response:            new(serviceaccounttypes.ServiceAccountWithRoles),
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusOK,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     nil,
	})).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.Get, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetServiceAccount",
			Tags:                []string{"serviceaccount"},
			Summary:             "Gets a service account",
			Description:         "This endpoint gets an existing service account",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(serviceaccounttypes.ServiceAccountWithRoles),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.ResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbRead,
			ID:       handler.PathParam("id"),
			Selector: handler.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/roles", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.GetRoles, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetServiceAccountRoles",
			Tags:                []string{"serviceaccount"},
			Summary:             "Gets service account roles",
			Description:         "This endpoint gets all the roles for the existing service account",
			Request:             nil,
			RequestContentType:  "",
			Response:            new([]*authtypes.Role),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.ResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbRead,
			ID:       handler.PathParam("id"),
			Selector: handler.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/roles", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.SetRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateServiceAccountRole",
			Tags:                []string{"serviceaccount"},
			Summary:             "Create service account role",
			Description:         "This endpoint assigns a role to a service account",
			Request:             new(serviceaccounttypes.PostableServiceAccountRole),
			RequestContentType:  "",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbAttach), coretypes.ResourceRole.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(
			handler.ResourceDef{
				Resource: coretypes.ResourceServiceAccount,
				Verb:     coretypes.VerbAttach,
				ID:       handler.PathParam("id"),
				Selector: handler.IDSelector,
				Related:  &handler.RelatedResource{Resource: coretypes.ResourceRole, ID: handler.BodyJSONPath("id")},
			},
			handler.ResourceDef{
				Resource: coretypes.ResourceRole,
				Verb:     coretypes.VerbAttach,
				ID:       handler.BodyJSONPath("id"),
				Selector: provider.roleSelector,
			},
		),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/roles/{rid}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.DeleteRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteServiceAccountRole",
			Tags:                []string{"serviceaccount"},
			Summary:             "Delete service account role",
			Description:         "This endpoint revokes a role from service account",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbDetach), coretypes.ResourceRole.Scope(coretypes.VerbDetach)}),
		},
		handler.WithResourceDefs(
			handler.ResourceDef{
				Resource: coretypes.ResourceServiceAccount,
				Verb:     coretypes.VerbDetach,
				ID:       handler.PathParam("id"),
				Selector: handler.IDSelector,
				Related:  &handler.RelatedResource{Resource: coretypes.ResourceRole, ID: handler.PathParam("rid")},
			},
			handler.ResourceDef{
				Resource: coretypes.ResourceRole,
				Verb:     coretypes.VerbDetach,
				ID:       handler.PathParam("rid"),
				Selector: provider.roleSelector,
			},
		),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/me", handler.New(provider.authzMiddleware.OpenAccess(provider.serviceAccountHandler.UpdateMe), handler.OpenAPIDef{
		ID:                  "UpdateMyServiceAccount",
		Tags:                []string{"serviceaccount"},
		Summary:             "Updates my service account",
		Description:         "This endpoint gets my service account",
		Request:             new(serviceaccounttypes.UpdatableServiceAccount),
		RequestContentType:  "",
		Response:            nil,
		ResponseContentType: "application/json",
		SuccessStatusCode:   http.StatusNoContent,
		ErrorStatusCodes:    []int{http.StatusNotFound},
		Deprecated:          false,
		SecuritySchemes:     nil,
	})).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.Update, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateServiceAccount",
			Tags:                []string{"serviceaccount"},
			Summary:             "Updates a service account",
			Description:         "This endpoint updates an existing service account",
			Request:             new(serviceaccounttypes.UpdatableServiceAccount),
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound, http.StatusBadRequest},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.ResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbUpdate,
			ID:       handler.PathParam("id"),
			Selector: handler.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.Delete, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteServiceAccount",
			Tags:                []string{"serviceaccount"},
			Summary:             "Deletes a service account",
			Description:         "This endpoint deletes an existing service account",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.ResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbDelete,
			ID:       handler.PathParam("id"),
			Selector: handler.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/keys", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.CreateFactorAPIKey, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateServiceAccountKey",
			Tags:                []string{"serviceaccount"},
			Summary:             "Create a service account key",
			Description:         "This endpoint creates a service account key",
			Request:             new(serviceaccounttypes.PostableFactorAPIKey),
			RequestContentType:  "",
			Response:            new(serviceaccounttypes.GettableFactorAPIKeyWithKey),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceFactorAPIKey.Scope(coretypes.VerbCreate), coretypes.ResourceServiceAccount.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(
			handler.ResourceDef{
				Resource: coretypes.ResourceMetaResourceFactorAPIKey,
				Verb:     coretypes.VerbCreate,
				ID:       handler.ResponseJSONPath("data.id"),
				Selector: handler.WildcardSelector,
			},
			handler.ResourceDef{
				Resource: coretypes.ResourceServiceAccount,
				Verb:     coretypes.VerbAttach,
				ID:       handler.PathParam("id"),
				Selector: handler.IDSelector,
				Related:  &handler.RelatedResource{Resource: coretypes.ResourceMetaResourceFactorAPIKey, ID: handler.ResponseJSONPath("data.id")},
			},
		),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/keys", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.ListFactorAPIKey, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "ListServiceAccountKeys",
			Tags:                []string{"serviceaccount"},
			Summary:             "List service account keys",
			Description:         "This endpoint lists the service account keys",
			Request:             nil,
			RequestContentType:  "",
			Response:            make([]*serviceaccounttypes.GettableFactorAPIKey, 0),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceFactorAPIKey.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.ResourceDef{
			Resource: coretypes.ResourceMetaResourceFactorAPIKey,
			Verb:     coretypes.VerbList,
			Selector: handler.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/keys/{fid}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.UpdateFactorAPIKey, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateServiceAccountKey",
			Tags:                []string{"serviceaccount"},
			Summary:             "Updates a service account key",
			Description:         "This endpoint updates an existing service account key",
			Request:             new(serviceaccounttypes.UpdatableFactorAPIKey),
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceFactorAPIKey.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.ResourceDef{
			Resource: coretypes.ResourceMetaResourceFactorAPIKey,
			Verb:     coretypes.VerbUpdate,
			ID:       handler.PathParam("fid"),
			Selector: handler.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/keys/{fid}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.RevokeFactorAPIKey, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "RevokeServiceAccountKey",
			Tags:                []string{"serviceaccount"},
			Summary:             "Revoke a service account key",
			Description:         "This endpoint revokes an existing service account key",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceFactorAPIKey.Scope(coretypes.VerbDelete), coretypes.ResourceServiceAccount.Scope(coretypes.VerbDetach)}),
		},
		handler.WithResourceDefs(
			handler.ResourceDef{
				Resource: coretypes.ResourceMetaResourceFactorAPIKey,
				Verb:     coretypes.VerbDelete,
				ID:       handler.PathParam("fid"),
				Selector: handler.IDSelector,
			},
			handler.ResourceDef{
				Resource: coretypes.ResourceServiceAccount,
				Verb:     coretypes.VerbDetach,
				ID:       handler.PathParam("id"),
				Selector: handler.IDSelector,
				Related:  &handler.RelatedResource{Resource: coretypes.ResourceMetaResourceFactorAPIKey, ID: handler.PathParam("fid")},
			},
		),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

// roleSelector resolves the FGA selectors for a role from its UUID. The id is
// already extracted by the ResourceDef (path or body); this only does the
// UUID -> name lookup the FGA object string requires. Shared by service account
// and role routes.
func (provider *provider) roleSelector(ctx context.Context, resource coretypes.Resource, id string, claims authtypes.Claims) ([]coretypes.Selector, error) {
	roleID, err := valuer.NewUUID(id)
	if err != nil {
		return nil, err
	}

	role, err := provider.authzService.Get(ctx, valuer.MustNewUUID(claims.OrgID), roleID)
	if err != nil {
		return nil, err
	}

	return []coretypes.Selector{
		resource.Type().MustSelector(role.Name),
		resource.Type().MustSelector(coretypes.WildCardSelectorString),
	}, nil
}
