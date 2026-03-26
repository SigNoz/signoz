package signozapiserver

import (
	"net/http"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	citypes "github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/gorilla/mux"
)

func (provider *provider) addCloudIntegrationRoutes(router *mux.Router) error {
	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts", handler.New(
		provider.authZ.AdminAccess(provider.cloudIntegrationHandler.CreateAccount),
		handler.OpenAPIDef{
			ID:                  "CreateAccount",
			Tags:                []string{"cloudintegration"},
			Summary:             "Create account",
			Description:         "This endpoint creates a new cloud integration account for the specified cloud provider",
			Request:             new(citypes.PostableConnectionArtifact),
			RequestContentType:  "application/json",
			Response:            new(citypes.GettableAccountWithArtifact),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts", handler.New(
		provider.authZ.AdminAccess(provider.cloudIntegrationHandler.ListAccounts),
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
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}", handler.New(
		provider.authZ.AdminAccess(provider.cloudIntegrationHandler.GetAccount),
		handler.OpenAPIDef{
			ID:                  "GetAccount",
			Tags:                []string{"cloudintegration"},
			Summary:             "Get account",
			Description:         "This endpoint gets an account for the specified cloud provider",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.GettableAccount),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}", handler.New(
		provider.authZ.AdminAccess(provider.cloudIntegrationHandler.UpdateAccount),
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
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/{id}", handler.New(
		provider.authZ.AdminAccess(provider.cloudIntegrationHandler.DisconnectAccount),
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
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodDelete).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/services", handler.New(
		provider.authZ.AdminAccess(provider.cloudIntegrationHandler.ListServicesMetadata),
		handler.OpenAPIDef{
			ID:                  "ListServicesMetadata",
			Tags:                []string{"cloudintegration"},
			Summary:             "List services metadata",
			Description:         "This endpoint lists the services metadata for the specified cloud provider",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.GettableServicesMetadata),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/services/{service_id}", handler.New(
		provider.authZ.AdminAccess(provider.cloudIntegrationHandler.GetService),
		handler.OpenAPIDef{
			ID:                  "GetService",
			Tags:                []string{"cloudintegration"},
			Summary:             "Get service",
			Description:         "This endpoint gets a service for the specified cloud provider",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(citypes.GettableService),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/services/{service_id}", handler.New(
		provider.authZ.AdminAccess(provider.cloudIntegrationHandler.UpdateService),
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
			SecuritySchemes:     newSecuritySchemes(types.RoleAdmin),
		},
	)).Methods(http.MethodPut).GetError(); err != nil {
		return err
	}

	// Agent check-in endpoint is kept same as older one to maintain backward compatibility with already deployed agents.
	// In the future, this endpoint will be deprecated and a new endpoint will be introduced for consistency with above endpoints.
	if err := router.Handle("/api/v1/cloud-integrations/{cloud_provider}/agent-check-in", handler.New(
		provider.authZ.ViewAccess(provider.cloudIntegrationHandler.AgentCheckIn),
		handler.OpenAPIDef{
			ID:                  "AgentCheckInDeprecated",
			Tags:                []string{"cloudintegration"},
			Summary:             "Agent check-in",
			Description:         "[Deprecated] This endpoint is called by the deployed agent to check in",
			Request:             new(citypes.PostableAgentCheckInRequest),
			RequestContentType:  "application/json",
			Response:            new(citypes.GettableAgentCheckInResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          true,                                 // this endpoint will be deprecated in future
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer), // agent role is viewer
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	if err := router.Handle("/api/v1/cloud_integrations/{cloud_provider}/accounts/check_in", handler.New(
		provider.authZ.ViewAccess(provider.cloudIntegrationHandler.AgentCheckIn),
		handler.OpenAPIDef{
			ID:                  "AgentCheckIn",
			Tags:                []string{"cloudintegration"},
			Summary:             "Agent check-in",
			Description:         "This endpoint is called by the deployed agent to check in",
			Request:             new(citypes.PostableAgentCheckInRequest),
			RequestContentType:  "application/json",
			Response:            new(citypes.GettableAgentCheckInResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer), // agent role is viewer
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	return nil
}
