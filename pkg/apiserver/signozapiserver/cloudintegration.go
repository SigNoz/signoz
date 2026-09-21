package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	citypes "github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addCloudIntegrationRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/credentials", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.GetConnectionCredentials, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "GetConnectionCredentials",
			Tags:                []string{"cloudintegration"},
			Summary:             "Get connection credentials",
			Description:         "This endpoint retrieves the connection credentials required for integration",
			Request:             nil,
			RequestContentType:  "application/json",
			Response:            new(citypes.Credentials),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes: newScopedSecuritySchemes([]string{
				coretypes.ResourceMetaResourceIngestionKey.Scope(coretypes.VerbCreate),
				coretypes.ResourceServiceAccount.Scope(coretypes.VerbCreate),
				coretypes.ResourceMetaResourceFactorAPIKey.Scope(coretypes.VerbCreate),
				coretypes.ResourceServiceAccount.Scope(coretypes.VerbAttach),
				coretypes.ResourceRole.Scope(coretypes.VerbAttach),
			}),
		},
		handler.WithResourceDefs(
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceIngestionKey,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryConfigurationChange,
				Selector: coretypes.WildcardSelector,
			},
			handler.BasicResourceDef{
				Resource: coretypes.ResourceServiceAccount,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryAccessControl,
				Selector: coretypes.WildcardSelector,
			},
			handler.BasicResourceDef{
				Resource: coretypes.ResourceMetaResourceFactorAPIKey,
				Verb:     coretypes.VerbCreate,
				Category: coretypes.ActionCategoryAccessControl,
				Selector: coretypes.WildcardSelector,
			},
			handler.AttachDetachSiblingResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryAccessControl,
				SourceResource: coretypes.ResourceServiceAccount,
				SourceSelector: coretypes.WildcardSelector,
				TargetResource: coretypes.ResourceRole,
				TargetIDs:      signozViewerRoleNamesExtractor(),
				TargetSelector: coretypes.IDSelector,
			},
			handler.AttachDetachParentChildResourceDef{
				Verb:           coretypes.VerbAttach,
				Category:       coretypes.ActionCategoryAccessControl,
				ParentResource: coretypes.ResourceServiceAccount,
				ParentSelector: coretypes.WildcardSelector,
				ChildResource:  coretypes.ResourceMetaResourceFactorAPIKey,
			},
		),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.CreateAccount, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "CreateAccount",
			Tags:                []string{"cloudintegration"},
			Summary:             "Create account",
			Description:         "This endpoint creates a new cloud integration account for the specified cloud provider",
			Request:             new(citypes.PostableAccount),
			RequestContentType:  "application/json",
			Response:            new(citypes.GettableAccountWithConnectionArtifact),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbCreate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbCreate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.ResponseJSONPath("data.id"),
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.ListAccounts, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListAccounts",
			Tags:                []string{"cloudintegration"},
			Summary:             "List accounts",
			Description:         "This endpoint lists the accounts for the specified cloud provider",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.GettableAccounts),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbList,
			Category: coretypes.ActionCategoryDataAccess,
			Selector: coretypes.WildcardSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.GetAccount, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetAccount",
			Tags:                []string{"cloudintegration"},
			Summary:             "Get account",
			Description:         "This endpoint gets an account for the specified cloud provider",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.Account),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.UpdateAccount, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateAccount",
			Tags:                []string{"cloudintegration"},
			Summary:             "Update account",
			Description:         "This endpoint updates an account for the specified cloud provider",
			Request:             new(citypes.UpdatableAccount),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.DisconnectAccount, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "DisconnectAccount",
			Tags:                []string{"cloudintegration"},
			Summary:             "Disconnect account",
			Description:         "This endpoint disconnects an account for the specified cloud provider",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbDelete)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbDelete,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/services", handler.New(
		provider.authzMiddleware.OpenAccess(provider.cloudIntegrationHandler.ListServicesMetadata),
		handler.OpenAPIDef{
			ID:                  "ListServicesMetadata",
			Tags:                []string{"cloudintegration"},
			Summary:             "List services metadata",
			Description:         "This endpoint lists the services metadata for the specified cloud provider, without any account context.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.GettableServicesMetadata),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes(nil),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}/services", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.ListAccountServicesMetadata, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "ListAccountServicesMetadata",
			Tags:                []string{"cloudintegration"},
			Summary:             "List account services metadata",
			Description:         "This endpoint lists the services metadata for the specified account and cloud provider",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.GettableServicesMetadata),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbList)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/services/{service_id}", handler.New(
		provider.authzMiddleware.OpenAccess(provider.cloudIntegrationHandler.GetService),
		handler.OpenAPIDef{
			ID:                  "GetService",
			Tags:                []string{"cloudintegration"},
			Summary:             "Get service",
			Description:         "This endpoint gets a service definition for the specified cloud provider, without any account context.",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.Service),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes(nil),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}/services/{service_id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.UpdateService, authtypes.SigNozAdminRoleName),
		handler.OpenAPIDef{
			ID:                  "UpdateService",
			Tags:                []string{"cloudintegration"},
			Summary:             "Update service",
			Description:         "This endpoint updates a service for the specified cloud provider",
			Request:             new(citypes.UpdatableService),
			RequestContentType:  "application/json",
			Response:            nil,
			ResponseContentType: "",
			SuccessStatusCode:   http.StatusNoContent,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbUpdate)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbUpdate,
			Category: coretypes.ActionCategoryConfigurationChange,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}/services/{service_id}", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.GetAccountService, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "GetAccountService",
			Tags:                []string{"cloudintegration"},
			Summary:             "Get service for account",
			Description:         "This endpoint gets a service and its configuration for the specified cloud integration account",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.Service),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	// Agent check-in endpoint is kept same as older one to maintain backward compatibility with already deployed agents.
	// In the future, this endpoint will be deprecated and a new endpoint will be introduced for consistency with above endpoints.
	if err := router.Handle("/api/v1/cloud-integrations/{cloud_provider}/agent-check-in", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.AgentCheckIn, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "AgentCheckInDeprecated",
			Tags:                []string{"cloudintegration"},
			Summary:             "Agent check-in",
			Description:         "[Deprecated] This endpoint is called by the deployed agent to check in",
			Request:             new(citypes.PostableAgentCheckIn),
			RequestContentType:  "application/json",
			Response:            new(citypes.GettableAgentCheckIn),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          true, // this endpoint will be deprecated in future
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.BodyJSONPath("account_id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/check_in", handler.New(
		provider.authzMiddleware.CheckResources(provider.cloudIntegrationHandler.AgentCheckIn, authtypes.SigNozAdminRoleName, authtypes.SigNozEditorRoleName, authtypes.SigNozViewerRoleName),
		handler.OpenAPIDef{
			ID:                  "AgentCheckIn",
			Tags:                []string{"cloudintegration"},
			Summary:             "Agent check-in",
			Description:         "This endpoint is called by the deployed agent to check in",
			Request:             new(citypes.PostableAgentCheckIn),
			RequestContentType:  "application/json",
			Response:            new(citypes.GettableAgentCheckIn),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newScopedSecuritySchemes([]string{coretypes.ResourceMetaResourceCloudIntegration.Scope(coretypes.VerbRead)}),
		},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceMetaResourceCloudIntegration,
			Verb:     coretypes.VerbRead,
			Category: coretypes.ActionCategoryDataAccess,
			ID:       coretypes.BodyJSONPath("cloudIntegrationId"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}

func signozViewerRoleNamesExtractor() coretypes.ResourceIDsExtractor {
	return coretypes.ResourceIDsExtractor{Phase: coretypes.PhaseRequest, Fn: func(coretypes.ExtractorContext) ([]string, error) {
		return []string{authtypes.SigNozViewerRoleName}, nil
	}}
}
