package cloudintegration

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Type() cloudintegrationtypes.CloudProviderType

	// GenerateConnectionArtifact generates cloud provider specific connection information,
	// client side handles how this information is shown
	GenerateConnectionArtifact(
		ctx context.Context,
		orgID valuer.UUID,
		provider cloudintegrationtypes.CloudProviderType,
		request *cloudintegrationtypes.PostableConnectionArtifact,
	) (*cloudintegrationtypes.ConnectionArtifact, error)

	// GetAccountStatus returns agent connection status for a cloud integration account
	GetAccountStatus(ctx context.Context, orgID, accountID valuer.UUID) (*cloudintegrationtypes.AccountStatus, error)

	// ListConnectedAccounts lists accounts where agent is connected
	ListConnectedAccounts(ctx context.Context, orgID valuer.UUID) (*cloudintegrationtypes.ConnectedAccountsList, error)

	// DisconnectAccount soft deletes/removes a cloud integration account.
	DisconnectAccount(ctx context.Context, orgID, accountID string) error

	// UpdateAccountConfig updates cloud integration account config
	UpdateAccountConfig(ctx context.Context, orgId, accountId valuer.UUID, config []byte) (cloudintegrationtypes.Account, error)

	// ListServices return list of services for a cloud provider attached with the accountID. This just returns a summary
	ListServices(ctx context.Context, orgID valuer.UUID, accountID *valuer.UUID) (*cloudintegrationtypes.ServiceSummaries, error)

	// GetServiceDetails returns service definition details for a serviceId. This returns config and
	// other details required to show in service details page on client.
	GetServiceDetails(ctx context.Context, orgID valuer.UUID, accountID *valuer.UUID) (*cloudintegrationtypes.Service, error)

	// UpdateServiceConfig updates cloud integration service config
	UpdateServiceConfig(ctx context.Context, serviceId string, orgID valuer.UUID, config []byte) (*cloudintegrationtypes.ServiceSummary, error)

	// AgentCheckIn is called by agent to heartbeat and get latest config in response.
	AgentCheckIn(
		ctx context.Context,
		orgID valuer.UUID,
		req *cloudintegrationtypes.AgentCheckInRequest,
	) (cloudintegrationtypes.AgentCheckInResponse, error)

	// GetDashboard returns dashboard json for a give cloud integration service dashboard.
	// this only returns the dashboard when account is connected and service is enabled
	GetDashboard(ctx context.Context, id string, orgID valuer.UUID) (*dashboardtypes.Dashboard, error)

	// GetAvailableDashboards returns list of available dashboards across all connected cloud integration accounts in the org.
	// this list gets added to dashboard list page
	GetAvailableDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)
}

type Handler interface {
	AgentCheckIn(http.ResponseWriter, *http.Request)

	GenerateConnectionParams(http.ResponseWriter, *http.Request)
	GenerateConnectionArtifact(http.ResponseWriter, *http.Request)

	ListConnectedAccounts(http.ResponseWriter, *http.Request)
	GetAccountStatus(http.ResponseWriter, *http.Request)
	ListServices(http.ResponseWriter, *http.Request)
	GetServiceDetails(http.ResponseWriter, *http.Request)

	UpdateAccountConfig(http.ResponseWriter, *http.Request)
	UpdateServiceConfig(http.ResponseWriter, *http.Request)

	DisconnectAccount(http.ResponseWriter, *http.Request)
}
