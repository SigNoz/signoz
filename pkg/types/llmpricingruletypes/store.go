package llmpricingruletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	List(ctx context.Context, orgID valuer.UUID, offset, limit int, search string, isOverride *bool) ([]*LLMPricingRule, int, error)
	Get(ctx context.Context, orgID, id valuer.UUID) (*LLMPricingRule, error)
	UpsertByID(ctx context.Context, rules []*LLMPricingRule) error
	UpsertBySourceID(ctx context.Context, rules []*LLMPricingRule) error
	Delete(ctx context.Context, orgID, id valuer.UUID) error
	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}
