package cloudintegration

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// CreateConnectionArtifact generates cloud provider specific connection information,
	// client side handles how this information is shown
	CreateConnectionArtifact(
		ctx context.Context,
		orgID valuer.UUID,
		provider cloudintegrationtypes.CloudProviderType,
		request *cloudintegrationtypes.ConnectionArtifactRequest,
	) (*cloudintegrationtypes.ConnectionArtifact, error)

	// GetAccountStatus returns agent connection status for a cloud integration account
	GetAccountStatus(ctx context.Context, orgID, accountID valuer.UUID) (*cloudintegrationtypes.AccountStatus, error)

	// ListConnectedAccounts lists accounts where agent is connected
	ListConnectedAccounts(ctx context.Context, orgID valuer.UUID) (*cloudintegrationtypes.ConnectedAccounts, error)

	// DisconnectAccount soft deletes/removes a cloud integration account.
	DisconnectAccount(ctx context.Context, orgID, accountID valuer.UUID) error

	// UpdateAccountConfig updates the configuration of an existing cloud account for a specific organization.
	UpdateAccountConfig(
		ctx context.Context,
		orgId,
		accountId valuer.UUID,
		config *cloudintegrationtypes.UpdateAccountConfigRequest,
	) (*cloudintegrationtypes.Account, error)

	// ListServicesSummary return list of services for a cloud provider attached with the accountID.
	// This just returns a summary of the service and not the whole service definition
	ListServicesSummary(ctx context.Context, orgID valuer.UUID, accountID *valuer.UUID) (*cloudintegrationtypes.ServicesSummary, error)

	// GetService returns service definition details for a serviceId. This returns config and
	// other details required to show in service details page on web client.
	GetService(ctx context.Context, orgID valuer.UUID, serviceID, string, accountID *valuer.UUID) (*cloudintegrationtypes.Service, error)

	// UpdateServiceConfig updates cloud integration service config
	UpdateServiceConfig(
		ctx context.Context,
		serviceId string,
		orgID valuer.UUID,
		config *cloudintegrationtypes.UpdateServiceConfigRequest,
	) (*cloudintegrationtypes.ServiceSummary, error)

	// AgentCheckIn is called by agent to heartbeat and get latest config in response.
	AgentCheckIn(
		ctx context.Context,
		orgID valuer.UUID,
		req *cloudintegrationtypes.AgentCheckInRequest,
	) (cloudintegrationtypes.AgentCheckInResponse, error)

	// GetDashboardByID returns dashboard JSON for a given dashboard id.
	// this only returns the dashboard when the service (embedded in dashboard id) is enabled for
	GetDashboardByID(ctx context.Context, id string, orgID valuer.UUID) (*dashboardtypes.Dashboard, error)

	// GetAllDashboards returns list of dashboards across all connected cloud integration accounts
	// and enabled services in the org. This list gets added to dashboard list page
	GetAllDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)
}

type Handler interface {
	AgentCheckIn(http.ResponseWriter, *http.Request)
	GenerateConnectionArtifact(http.ResponseWriter, *http.Request)
	ListConnectedAccounts(http.ResponseWriter, *http.Request)
	GetAccountStatus(http.ResponseWriter, *http.Request)
	ListServices(http.ResponseWriter, *http.Request)
	GetServiceDetails(http.ResponseWriter, *http.Request)
	UpdateAccountConfig(http.ResponseWriter, *http.Request)
	UpdateServiceConfig(http.ResponseWriter, *http.Request)
	DisconnectAccount(http.ResponseWriter, *http.Request)
}
