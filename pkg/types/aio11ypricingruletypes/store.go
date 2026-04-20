package aio11ypricingruletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	List(ctx context.Context, orgID valuer.UUID, offset, limit int) ([]*StorablePricingRule, int, error)
	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*StorablePricingRule, error)
	Create(ctx context.Context, rule *StorablePricingRule) error
	Update(ctx context.Context, rule *StorablePricingRule) error
	Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error
}
