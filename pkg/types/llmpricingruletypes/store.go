package llmpricingruletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	List(ctx context.Context, orgID valuer.UUID, offset, limit int) ([]*LLMPricingRule, int, error)
	Get(ctx context.Context, orgID, id valuer.UUID) (*LLMPricingRule, error)
	GetBySourceID(ctx context.Context, orgID, sourceID valuer.UUID) (*LLMPricingRule, error)
	Create(ctx context.Context, rule *LLMPricingRule) error
	Update(ctx context.Context, rule *LLMPricingRule) error
	Delete(ctx context.Context, orgID, id valuer.UUID) error
	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}
