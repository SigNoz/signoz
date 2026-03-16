package cloudintegrationtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// GetAccountByID returns a cloud integration account by id
	GetAccountByID(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) (*StorableCloudIntegration, error)

	// CreateAccount creates a new cloud integration account
	CreateAccount(ctx context.Context, orgID valuer.UUID, account *StorableCloudIntegration) (*StorableCloudIntegration, error)

	// UpdateAccount updates an existing cloud integration account
	UpdateAccount(ctx context.Context, account *StorableCloudIntegration) error

	// RemoveAccount marks a cloud integration account as removed by setting the RemovedAt field
	RemoveAccount(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) error

	// GetConnectedAccounts returns all the cloud integration accounts for the org and cloud provider
	GetConnectedAccounts(ctx context.Context, orgID valuer.UUID, provider CloudProviderType) ([]*StorableCloudIntegration, error)

	// GetConnectedAccount for given provider
	GetConnectedAccount(ctx context.Context, orgID valuer.UUID, provider CloudProviderType, providerAccountID string) (*StorableCloudIntegration, error)

	// cloud_integration_service related methods

	// GetServiceByType returns the cloud integration service for the given cloud integration id and service type
	GetServiceByType(ctx context.Context, cloudIntegrationID valuer.UUID, serviceType string) (*StorableCloudIntegrationService, error)

	// CreateService creates a new cloud integration service for the given cloud integration id and service type
	CreateService(ctx context.Context, cloudIntegrationID valuer.UUID, service *StorableCloudIntegrationService) (*StorableCloudIntegrationService, error)

	// UpdateService updates an existing cloud integration service for the given cloud integration id and service type
	UpdateService(ctx context.Context, cloudIntegrationID valuer.UUID, service *StorableCloudIntegrationService) error

	// GetServices returns all the cloud integration services for the given cloud integration id
	GetServices(ctx context.Context, cloudIntegrationID valuer.UUID) ([]*StorableCloudIntegrationService, error)
}
