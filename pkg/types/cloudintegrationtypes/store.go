package cloudintegrationtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// GetAccountByID returns a cloud integration account by id
	GetAccountByID(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) (*StorableCloudIntegration, error)

	// GetConnectedAccount for a given provider
	GetConnectedAccount(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) (*StorableCloudIntegration, error)

	// GetConnectedAccountByProviderAccountID returns the connected cloud integration account for a given provider account id
	GetConnectedAccountByProviderAccountID(ctx context.Context, orgID valuer.UUID, providerAccountID string, provider CloudProviderType) (*StorableCloudIntegration, error)

	// ListConnectedAccounts returns all the cloud integration accounts for the org and cloud provider
	ListConnectedAccounts(ctx context.Context, orgID valuer.UUID, provider CloudProviderType) ([]*StorableCloudIntegration, error)

	// CountConnectedAccounts returns the count of connected accounts for the org and cloud provider
	CountConnectedAccounts(ctx context.Context, orgID valuer.UUID, provider CloudProviderType) (int, error)

	// CreateAccount creates a new cloud integration account
	CreateAccount(ctx context.Context, account *StorableCloudIntegration) error

	// UpdateAccount updates an existing cloud integration account
	UpdateAccount(ctx context.Context, account *StorableCloudIntegration) error

	// RemoveAccount marks a cloud integration account as removed by setting the RemovedAt field
	RemoveAccount(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) error

	// cloud_integration_service related methods

	// GetServiceByServiceID returns the cloud integration service for the given cloud integration id and service id
	GetServiceByServiceID(ctx context.Context, cloudIntegrationID valuer.UUID, serviceID ServiceID) (*StorableCloudIntegrationService, error)

	// ListServices returns all the cloud integration services for the given cloud integration id
	ListServices(ctx context.Context, cloudIntegrationID valuer.UUID) ([]*StorableCloudIntegrationService, error)

	// ListSharedServices returns a map of service type to services from other connected accounts
	// that share that service type with the given cloudIntegrationID.
	// Only service types present in the given account are included.
	// The caller is responsible for any further filtering (e.g. metrics-enabled checks).
	ListSharedServices(ctx context.Context, orgID valuer.UUID, provider CloudProviderType, cloudIntegrationID valuer.UUID) (map[ServiceID][]*StorableCloudIntegrationService, error)

	// CreateService creates a new cloud integration service
	CreateService(ctx context.Context, service *StorableCloudIntegrationService) error

	// UpdateService updates an existing cloud integration service
	UpdateService(ctx context.Context, service *StorableCloudIntegrationService) error

	// DeleteServicesByCloudIntegrationID deletes all services for the given cloud integration id
	DeleteServicesByCloudIntegrationID(ctx context.Context, orgID, cloudIntegrationID valuer.UUID) error

	RunInTx(context.Context, func(ctx context.Context) error) error

	CreateIntegrationDashboard(ctx context.Context, row *StorableIntegrationDashboard) error

	GetIntegrationDashboardBySlug(ctx context.Context, orgID valuer.UUID, provider IntegrationDashboardProviderType, slug string) (*StorableIntegrationDashboard, error)

	ListIntegrationDashboardsBySlugPrefix(ctx context.Context, orgID valuer.UUID, provider IntegrationDashboardProviderType, slugPrefix string) ([]*StorableIntegrationDashboard, error)

	DeleteIntegrationDashboardBySlug(ctx context.Context, orgID valuer.UUID, provider IntegrationDashboardProviderType, slug string) error
}

type ServiceDefinitionStore interface {
	List(ctx context.Context, provider CloudProviderType) ([]*ServiceDefinition, error)
	Get(ctx context.Context, provider CloudProviderType, serviceID ServiceID) (*ServiceDefinition, error)
}
