package cloudintegration

import (
	"context"
	"net/http"

	citypes "github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	CreateAccount(ctx context.Context, account *citypes.Account) error

	// GetAccount returns cloud integration account
	GetAccount(ctx context.Context, orgID, accountID valuer.UUID) (*citypes.Account, error)

	// ListAccounts lists accounts where agent is connected
	ListAccounts(ctx context.Context, orgID valuer.UUID) ([]*citypes.Account, error)

	// UpdateAccount updates the cloud integration account for a specific organization.
	UpdateAccount(ctx context.Context, account *citypes.Account) error

	// DisconnectAccount soft deletes/removes a cloud integration account.
	DisconnectAccount(ctx context.Context, orgID, accountID valuer.UUID) error

	// GetConnectionArtifact returns cloud provider specific connection information,
	// client side handles how this information is shown
	GetConnectionArtifact(ctx context.Context, account *citypes.Account, req *citypes.ConnectionArtifactRequest) (*citypes.ConnectionArtifact, error)

	// ListServicesMetadata returns the list of services metadata for a cloud provider attached with the integrationID.
	// This just returns a summary of the service and not the whole service definition
	ListServicesMetadata(ctx context.Context, orgID valuer.UUID, integrationID *valuer.UUID) ([]*citypes.ServiceMetadata, error)

	// GetService returns service definition details for a serviceID. This returns config and
	// other details required to show in service details page on web client.
	GetService(ctx context.Context, orgID valuer.UUID, integrationID *valuer.UUID, serviceID string) (*citypes.Service, error)

	// UpdateService updates cloud integration service
	UpdateService(ctx context.Context, orgID valuer.UUID, service *citypes.CloudIntegrationService) error

	// AgentCheckIn is called by agent to heartbeat and get latest config in response.
	AgentCheckIn(ctx context.Context, orgID valuer.UUID, req *citypes.AgentCheckInRequest) (*citypes.AgentCheckInResponse, error)

	// GetDashboardByID returns dashboard JSON for a given dashboard id.
	// this only returns the dashboard when the service (embedded in dashboard id) is enabled
	// in the org for any cloud integration account
	GetDashboardByID(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error)

	// ListDashboards returns list of dashboards across all connected cloud integration accounts
	// for enabled services in the org. This list gets added to dashboard list page
	ListDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)
}

type Handler interface {
	GetConnectionArtifact(http.ResponseWriter, *http.Request)
	ListAccounts(http.ResponseWriter, *http.Request)
	GetAccount(http.ResponseWriter, *http.Request)
	UpdateAccount(http.ResponseWriter, *http.Request)
	DisconnectAccount(http.ResponseWriter, *http.Request)
	ListServicesMetadata(http.ResponseWriter, *http.Request)
	GetService(http.ResponseWriter, *http.Request)
	UpdateService(http.ResponseWriter, *http.Request)
	AgentCheckIn(http.ResponseWriter, *http.Request)
}
