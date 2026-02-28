package cloudintegrationtypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
)

type CloudIntegrationAccountStore interface {
	ListConnected(ctx context.Context, orgId string, provider string) ([]types.CloudIntegration, *model.ApiError)

	Get(ctx context.Context, orgId string, provider string, id string) (*types.CloudIntegration, *model.ApiError)

	GetConnectedCloudAccount(ctx context.Context, orgId string, provider string, accountID string) (*types.CloudIntegration, *model.ApiError)

	// Insert an account or update it by (cloudProvider, id)
	// for specified non-empty fields
	Upsert(
		ctx context.Context,
		orgId string,
		provider string,
		id *string,
		config *types.AccountConfig,
		accountId *string,
		agentReport *types.AgentReport,
		removedAt *time.Time,
	) (*types.CloudIntegration, *model.ApiError)
}

type CloudIntegrationServiceStore interface {
	Get(
		ctx context.Context,
		orgID string,
		cloudAccountId string,
		serviceType string,
	) (*types.CloudServiceConfig, *model.ApiError)

	Upsert(
		ctx context.Context,
		orgID string,
		cloudProvider string,
		cloudAccountId string,
		serviceId string,
		config types.CloudServiceConfig,
	) (*types.CloudServiceConfig, *model.ApiError)

	GetAllForAccount(
		ctx context.Context,
		orgID string,
		cloudAccountId string,
	) (
		configsBySvcId map[string]*types.CloudServiceConfig,
		apiErr *model.ApiError,
	)
}
