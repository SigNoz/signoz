package llmpricingruletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	List(ctx context.Context, orgID valuer.UUID, offset, limit int) ([]*StorableLLMPricingRule, int, error)
	Get(ctx context.Context, orgID, id valuer.UUID) (*StorableLLMPricingRule, error)
	GetBySourceID(ctx context.Context, orgID, sourceID valuer.UUID) (*StorableLLMPricingRule, error)
	Create(ctx context.Context, rule *StorableLLMPricingRule) error
	Update(ctx context.Context, rule *StorableLLMPricingRule) error
	Delete(ctx context.Context, orgID, id valuer.UUID) error
}
