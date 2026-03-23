package cloudintegrationtypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	// GetAccountByID returns a cloud integration account by id
	GetAccountByID(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) (*StorableCloudIntegration, error)

	// CreateAccount creates a new cloud integration account
	CreateAccount(ctx context.Context, account *StorableCloudIntegration) (*StorableCloudIntegration, error)

	// UpdateAccount updates an existing cloud integration account
	UpdateAccount(ctx context.Context, account *StorableCloudIntegration) error

	// RemoveAccount marks a cloud integration account as removed by setting the RemovedAt field
	RemoveAccount(ctx context.Context, orgID, id valuer.UUID, provider CloudProviderType) error

	// ListConnectedAccounts returns all the cloud integration accounts for the org and cloud provider
	ListConnectedAccounts(ctx context.Context, orgID valuer.UUID, provider CloudProviderType) ([]*StorableCloudIntegration, error)

	// GetConnectedAccount for a given provider
	GetConnectedAccount(ctx context.Context, orgID valuer.UUID, provider CloudProviderType, providerAccountID string) (*StorableCloudIntegration, error)

	// cloud_integration_service related methods

	// GetServiceByServiceID returns the cloud integration service for the given cloud integration id and service id
	GetServiceByServiceID(ctx context.Context, cloudIntegrationID valuer.UUID, serviceID ServiceID) (*StorableCloudIntegrationService, error)

	// CreateService creates a new cloud integration service
	CreateService(ctx context.Context, service *StorableCloudIntegrationService) (*StorableCloudIntegrationService, error)

	// UpdateService updates an existing cloud integration service
	UpdateService(ctx context.Context, service *StorableCloudIntegrationService) error

	// ListServices returns all the cloud integration services for the given cloud integration id
	ListServices(ctx context.Context, cloudIntegrationID valuer.UUID) ([]*StorableCloudIntegrationService, error)
}
