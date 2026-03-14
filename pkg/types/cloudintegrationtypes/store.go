package cloudintegrationtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// GetAccountByID returns a cloud integration account by id
	GetAccountByID(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) (*StorableCloudIntegration, error)

	// UpsertAccount creates or updates a cloud integration account
	UpsertAccount(ctx context.Context, account *StorableCloudIntegration) error

	// RemoveAccount marks a cloud integration account as removed by setting the RemovedAt field
	RemoveAccount(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) error

	// GetConnectedAccounts returns all the cloud integration accounts for the org and cloud provider
	GetConnectedAccounts(ctx context.Context, orgID valuer.UUID, provider CloudProviderType) ([]*StorableCloudIntegration, error)

	// GetConnectedAccount for given provider
	GetConnectedAccount(ctx context.Context, orgID valuer.UUID, provider CloudProviderType, providerAccountID string) (*StorableCloudIntegration, error)

	// cloud_integration_service related methods

	// GetServiceByType returns the cloud integration service for the given cloud integration id and service type
	GetServiceByType(ctx context.Context, cloudIntegrationID valuer.UUID, serviceType string) (*StorableCloudIntegrationService, error)

	// UpsertService creates or updates a cloud integration service for the given cloud integration id and service type
	UpsertService(ctx context.Context, service *StorableCloudIntegrationService) error

	// GetServices returns all the cloud integration services for the given cloud integration id
	GetServices(ctx context.Context, cloudIntegrationID valuer.UUID) ([]*StorableCloudIntegrationService, error)
}
