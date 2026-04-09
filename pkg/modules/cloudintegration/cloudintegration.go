package cloudintegration

import (
	"context"
	"net/http"

	citypes "github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	GetConnectionCredentials(ctx context.Context, orgID valuer.UUID, provider citypes.CloudProviderType) (*citypes.Credentials, error)

	CreateAccount(ctx context.Context, account *citypes.Account) error

	// GetAccount returns cloud integration account
	GetAccount(ctx context.Context, orgID, accountID valuer.UUID, provider citypes.CloudProviderType) (*citypes.Account, error)

	// ListAccounts lists accounts where agent is connected
	ListAccounts(ctx context.Context, orgID valuer.UUID, provider citypes.CloudProviderType) ([]*citypes.Account, error)

	// UpdateAccount updates the cloud integration account for a specific organization.
	UpdateAccount(ctx context.Context, account *citypes.Account) error

	// DisconnectAccount soft deletes/removes a cloud integration account.
	DisconnectAccount(ctx context.Context, orgID, accountID valuer.UUID, provider citypes.CloudProviderType) error

	// GetConnectionArtifact returns cloud provider specific connection information,
	// client side handles how this information is shown
	GetConnectionArtifact(ctx context.Context, account *citypes.Account, req *citypes.GetConnectionArtifactRequest) (*citypes.ConnectionArtifact, error)

	// ListServicesMetadata returns the list of supported services' metadata for a cloud provider with optional filtering for a specific integration
	// This just returns a summary of the service and not the whole service definition.
	ListServicesMetadata(ctx context.Context, orgID valuer.UUID, provider citypes.CloudProviderType, integrationID *valuer.UUID) ([]*citypes.ServiceMetadata, error)

	// GetService returns service definition details for a serviceID. This optionally returns the service config
	// for integrationID if provided.
	GetService(ctx context.Context, orgID valuer.UUID, integrationID *valuer.UUID, serviceID citypes.ServiceID, provider citypes.CloudProviderType) (*citypes.Service, error)

	// CreateService creates a new service for a cloud integration account.
	CreateService(ctx context.Context, orgID valuer.UUID, service *citypes.CloudIntegrationService, provider citypes.CloudProviderType) error

	// UpdateService updates cloud integration service
	UpdateService(ctx context.Context, orgID valuer.UUID, service *citypes.CloudIntegrationService, provider citypes.CloudProviderType) error

	// AgentCheckIn is called by agent to send heartbeat and get latest config in response.
	AgentCheckIn(ctx context.Context, orgID valuer.UUID, provider citypes.CloudProviderType, req *citypes.AgentCheckInRequest) (*citypes.AgentCheckInResponse, error)

	// GetDashboardByID returns dashboard JSON for a given dashboard id.
	// this only returns the dashboard when the service (embedded in dashboard id) is enabled
	// in the org for any cloud integration account
	GetDashboardByID(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error)

	// ListDashboards returns list of dashboards across all connected cloud integration accounts
	// for enabled services in the org. This list gets added to dashboard list page
	ListDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)
}

type CloudProviderModule interface {
	GetConnectionArtifact(ctx context.Context, account *citypes.Account, req *citypes.GetConnectionArtifactRequest) (*citypes.ConnectionArtifact, error)

	// ListServiceDefinitions returns all service definitions for this cloud provider.
	ListServiceDefinitions(ctx context.Context) ([]*citypes.ServiceDefinition, error)

	// GetServiceDefinition returns the service definition for the given service ID.
	GetServiceDefinition(ctx context.Context, serviceID citypes.ServiceID) (*citypes.ServiceDefinition, error)

	// BuildIntegrationConfig compiles the provider-specific integration config from the account
	// and list of configured services. This is the config returned to the agent on check-in.
	BuildIntegrationConfig(ctx context.Context, account *citypes.Account, services []*citypes.StorableCloudIntegrationService) (*citypes.ProviderIntegrationConfig, error)
}

type Handler interface {
	GetConnectionCredentials(http.ResponseWriter, *http.Request)
	CreateAccount(http.ResponseWriter, *http.Request)
	ListAccounts(http.ResponseWriter, *http.Request)
	GetAccount(http.ResponseWriter, *http.Request)
	UpdateAccount(http.ResponseWriter, *http.Request)
	DisconnectAccount(http.ResponseWriter, *http.Request)
	ListServicesMetadata(http.ResponseWriter, *http.Request)
	GetService(http.ResponseWriter, *http.Request)
	UpdateService(http.ResponseWriter, *http.Request)
	AgentCheckIn(http.ResponseWriter, *http.Request)
}
