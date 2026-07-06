package metricreductionruletypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Order struct {
	valuer.String
}

var (
	OrderAsc  = Order{valuer.NewString("asc")}
	OrderDesc = Order{valuer.NewString("desc")}
)

func (Order) Enum() []any {
	return []any{OrderAsc, OrderDesc}
}

type ReductionRuleOrderBy struct {
	valuer.String
}

var (
	OrderByMetricName     = ReductionRuleOrderBy{valuer.NewString("metric")}
	OrderByIngestedVolume = ReductionRuleOrderBy{valuer.NewString("ingested_volume")}
	OrderByReducedVolume  = ReductionRuleOrderBy{valuer.NewString("reduced_volume")}
	OrderByLastUpdated    = ReductionRuleOrderBy{valuer.NewString("last_updated")}
)

func (ReductionRuleOrderBy) Enum() []any {
	return []any{OrderByMetricName, OrderByIngestedVolume, OrderByReducedVolume, OrderByLastUpdated}
}

type ListReductionRulesParams struct {
	OrderBy    ReductionRuleOrderBy `query:"orderBy,default=ingested_volume" json:"orderBy"`
	Order      Order                `query:"order,default=desc" json:"order"`
	Search     string               `query:"search" json:"search"`
	MetricName string               `query:"metricName" json:"metricName,omitempty"`
	Offset     int                  `query:"offset" json:"offset"`
	Limit      int                  `query:"limit,default=10" json:"limit"`
}

const maxReductionRulesPageSize = 1000

func (p *ListReductionRulesParams) Validate() error {
	if p.Limit <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must be greater than 0")
	}
	if p.Limit > maxReductionRulesPageSize {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "limit must not exceed %d", maxReductionRulesPageSize)
	}
	if p.Offset < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "offset must not be negative")
	}
	return nil
}
