package metricreductionruletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	List(ctx context.Context, orgID valuer.UUID, params *ListReductionRulesParams) ([]*ReductionRule, int, error)
	Get(ctx context.Context, orgID valuer.UUID, metricName string) (*ReductionRule, error)
	GetByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*ReductionRule, error)
	Create(ctx context.Context, rule *ReductionRule) error
	Upsert(ctx context.Context, rule *ReductionRule) error
	DeleteByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error
	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}
