package signozapiserver

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
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
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
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
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryAccessControl,
			Selector: coretypes.WildcardSelector,
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
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
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
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/roles", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.SetRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateServiceAccountRoleDeprecated",
			Tags:                []string{"serviceaccount"},
			Summary:             "Create service account role",
			Description:         "This endpoint assigns a role to a service account",
			Request:             new(serviceaccounttypes.DeprecatedPostableServiceAccountRole),
			RequestContentType:  "",
			Response:            new(types.Identifiable),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbAttach), coretypes.ResourceRole.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(handler.AttachDetachSiblingResourceDef{
			Verb:           coretypes.VerbAttach,
			Category:       coretypes.ActionCategoryAccessControl,
			SourceResource: coretypes.ResourceServiceAccount,
			SourceIDs:      coretypes.OneID(coretypes.PathParam("id")),
			SourceSelector: coretypes.IDSelector,
			TargetResource: coretypes.ResourceRole,
			TargetIDs:      coretypes.OneID(coretypes.BodyJSONPath("id")),
			TargetSelector: provider.roleSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_accounts/{id}/roles/{rid}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.DeleteRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteServiceAccountRoleDeprecated",
			Tags:                []string{"serviceaccount"},
			Summary:             "Delete service account role",
			Description:         "This endpoint revokes a role from service account",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          true,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbDetach), coretypes.ResourceRole.Scope(coretypes.VerbDetach)}),
		},
		handler.WithResourceDefs(handler.AttachDetachSiblingResourceDef{
			Verb:           coretypes.VerbDetach,
			Category:       coretypes.ActionCategoryAccessControl,
			SourceResource: coretypes.ResourceServiceAccount,
			SourceIDs:      coretypes.OneID(coretypes.PathParam("id")),
			SourceSelector: coretypes.IDSelector,
			TargetResource: coretypes.ResourceRole,
			TargetIDs:      coretypes.OneID(coretypes.PathParam("rid")),
			TargetSelector: provider.roleSelector,
		}),
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
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
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
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
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
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceFactorAPIKey,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryAccessControl,
				ID:       coretypes.ResponseJSONPath("data.id"),
				Selector: coretypes.WildcardSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryAccessControl,
				ParentResource: coretypes.ResourceServiceAccount,
				ParentID:       coretypes.PathParam("id"),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceFactorAPIKey,
				ChildIDs:       coretypes.OneID(coretypes.ResponseJSONPath("data.id")),
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
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceFactorAPIKey,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryAccessControl,
			Selector: coretypes.WildcardSelector,
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
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceFactorAPIKey,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       coretypes.PathParam("fid"),
			Selector: coretypes.IDSelector,
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
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceFactorAPIKey,
				Verb:     coretypes.VerbDelete,
				Category: coretypes.ActionCategoryAccessControl,
				ID:       coretypes.PathParam("fid"),
				Selector: coretypes.IDSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbDetach,
				Category:       coretypes.ActionCategoryAccessControl,
				ParentResource: coretypes.ResourceServiceAccount,
				ParentID:       coretypes.PathParam("id"),
				ParentSelector: coretypes.IDSelector,
				ChildResource:  coretypes.ResourceMetaResourceFactorAPIKey,
				ChildIDs:       coretypes.OneID(coretypes.PathParam("fid")),
			},
		),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_account_roles", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.CreateServiceAccountRole, authtypes.SigNozAdminRoleName),
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
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbAttach), coretypes.ResourceRole.Scope(coretypes.VerbAttach)}),
		},
		handler.WithResourceDefs(handler.AttachDetachSiblingResourceDef{
			Verb:           coretypes.VerbAttach,
			Category:       coretypes.ActionCategoryAccessControl,
			SourceResource: coretypes.ResourceServiceAccount,
			SourceIDs:      coretypes.OneID(coretypes.BodyJSONPath("serviceAccountId")),
			SourceSelector: coretypes.IDSelector,
			TargetResource: coretypes.ResourceRole,
			TargetIDs:      coretypes.OneID(coretypes.BodyJSONPath("roleId")),
			TargetSelector: provider.roleSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_account_roles/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.GetServiceAccountRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetServiceAccountRole",
			Tags:                []string{"serviceaccount"},
			Summary:             "Get service account role",
			Description:         "This endpoint gets an existing service account role",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(serviceaccounttypes.ServiceAccountRole),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceServiceAccount,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryAccessControl,
			ID:       provider.serviceAccountIDExtractor(),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/service_account_roles/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.serviceAccountHandler.DeleteServiceAccountRole, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DeleteServiceAccountRole",
			Tags:                []string{"serviceaccount"},
			Summary:             "Delete service account role",
			Description:         "This endpoint revokes a role from a service account",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceServiceAccount.Scope(coretypes.VerbDetach), coretypes.ResourceRole.Scope(coretypes.VerbDetach)}),
		},
		handler.WithResourceDefs(handler.AttachDetachSiblingResourceDef{
			Verb:           coretypes.VerbDetach,
			Category:       coretypes.ActionCategoryAccessControl,
			SourceResource: coretypes.ResourceServiceAccount,
			SourceIDs:      coretypes.OneID(provider.serviceAccountIDExtractor()),
			SourceSelector: coretypes.IDSelector,
			TargetResource: coretypes.ResourceRole,
			TargetIDs:      coretypes.OneID(provider.roleIDExtractor()),
			TargetSelector: provider.roleSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	return nil
}

func (provider *provider) roleSelector(ctx context.Context, resource coretypes.Resource, id string, orgID valuer.UUID) ([]coretypes.Selector, error) {
	roleID, err := valuer.NewUUID(id)
	if err != nil {
		return nil, err
	}

	role, err := provider.authzService.Get(ctx, orgID, roleID)
	if err != nil {
		return nil, err
	}

	return []coretypes.Selector{
		resource.Type().MustSelector(role.Name),
		resource.Type().MustSelector(coretypes.WildCardSelectorString),
	}, nil
}

func (provider *provider) roleIDExtractor() coretypes.ResourceIDExtractor {
	return coretypes.NewResourceIDExtractor(coretypes.PhaseRequest, func(ec coretypes.ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}

		claims, err := authtypes.ClaimsFromContext(ec.Request.Context())
		if err != nil {
			return "", err
		}

		serviceAccountRoleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
		if err != nil {
			return "", err
		}

		serviceAccountRole, err := provider.serviceAccountGetter.GetServiceAccountRole(ec.Request.Context(), valuer.MustNewUUID(claims.OrgID), serviceAccountRoleID)
		if err != nil {
			return "", err
		}

		return serviceAccountRole.RoleID.String(), nil
	})
}

func (provider *provider) serviceAccountIDExtractor() coretypes.ResourceIDExtractor {
	return coretypes.NewResourceIDExtractor(coretypes.PhaseRequest, func(ec coretypes.ExtractorContext) (string, error) {
		if ec.Request == nil {
			return "", nil
		}

		claims, err := authtypes.ClaimsFromContext(ec.Request.Context())
		if err != nil {
			return "", err
		}

		serviceAccountRoleID, err := valuer.NewUUID(mux.Vars(ec.Request)["id"])
		if err != nil {
			return "", err
		}

		serviceAccountRole, err := provider.serviceAccountGetter.GetServiceAccountRole(ec.Request.Context(), valuer.MustNewUUID(claims.OrgID), serviceAccountRoleID)
		if err != nil {
			return "", err
		}

		return serviceAccountRole.ServiceAccountID.String(), nil
	})
}
