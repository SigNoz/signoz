package cloudintegrationtypes

import (
	"context"
	"time"
)

type CloudIntegrationAccountStore interface {
	ListConnected(ctx context.Context, orgId string, provider string) ([]CloudIntegration, error)

	Get(ctx context.Context, orgId string, provider string, id string) (*CloudIntegration, error)

	GetConnectedCloudAccount(ctx context.Context, orgId, provider string, accountID string) (*CloudIntegration, error)

	// Insert an account or update it by (cloudProvider, id)
	// for specified non-empty fields
	Upsert(
		ctx context.Context,
		orgId string,
		provider string,
		id *string,
		config []byte,
		accountId *string,
		agentReport *AgentReport,
		removedAt *time.Time,
	) (*CloudIntegration, error)
}

type CloudIntegrationServiceStore interface {
	Get(ctx context.Context, orgID, cloudAccountId, serviceType string) ([]byte, error)

	Upsert(
		ctx context.Context,
		orgID,
		cloudProvider,
		cloudAccountId,
		serviceId string,
		config []byte,
	) ([]byte, error)

	GetAllForAccount(ctx context.Context, orgID, cloudAccountId string) (map[string][]byte, error)
}
