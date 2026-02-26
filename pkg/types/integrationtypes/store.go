package integrationtypes

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	ErrCodeCloudIntegrationAccountNotFound errors.Code = errors.MustNewCode("cloud_integration_account_not_found")
)

// CloudIntegrationAccountsStore defines the interface for cloud integration accounts persistence.
type Store interface {
	ListConnected(ctx context.Context, orgId string, provider string) ([]CloudIntegration, error)
	Get(ctx context.Context, orgId string, provider string, id string) (*CloudIntegration, error)
	GetConnectedCloudAccount(ctx context.Context, orgId, provider string, accountID string) (*CloudIntegration, error)
	// Upsert inserts an account or updates it by (cloudProvider, id) for specified non-empty fields.
	Upsert(ctx context.Context, orgId string, provider string, id *string, config []byte, accountId *string, agentReport *AgentReport, removedAt *time.Time) (*CloudIntegration, error)
}
