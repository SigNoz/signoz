package metricreductionruletypes

import (
	"context"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type Store interface {
	List(ctx context.Context, orgID valuer.UUID, params *ListReductionRulesParams) ([]*StorableReductionRule, int, error)
	Get(ctx context.Context, orgID valuer.UUID, metricName string) (*StorableReductionRule, error)
	GetByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*StorableReductionRule, error)
	Create(ctx context.Context, rule *StorableReductionRule) error
	Upsert(ctx context.Context, rule *StorableReductionRule) error
	Delete(ctx context.Context, orgID valuer.UUID, metricName string) error
	DeleteByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error
	RunInTx(ctx context.Context, cb func(ctx context.Context) error) error
}
