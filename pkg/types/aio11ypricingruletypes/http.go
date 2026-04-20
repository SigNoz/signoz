package aio11ypricingruletypes

import "github.com/SigNoz/signoz/pkg/valuer"

type GettablePricingRule = PricingRule

func NewGettablePricingRule(r *PricingRule) *GettablePricingRule {
	return r
}

type PostablePricingRule struct {
	Model          string    `json:"modelName"       required:"true"`
	ModelPattern   []string  `json:"modelPattern"    required:"true"`
	Unit           Unit      `json:"unit"             required:"true"`
	CacheMode      CacheMode `json:"cacheMode"       required:"true"`
	CostInput      float64   `json:"costInput"       required:"true"`
	CostOutput     float64   `json:"costOutput"      required:"true"`
	CostCacheRead  float64   `json:"costCacheRead"  required:"true"`
	CostCacheWrite float64   `json:"costCacheWrite" required:"true"`
	Enabled        bool      `json:"enabled"          required:"true"`
}

type UpdatablePricingRule struct {
	Model          *string   `json:"modelName,omitempty"`
	ModelPattern   []string  `json:"modelPattern,omitempty"`
	Unit           Unit      `json:"unit,omitempty"`
	CacheMode      CacheMode `json:"cacheMode,omitempty"`
	CostInput      *float64  `json:"costInput,omitempty"`
	CostOutput     *float64  `json:"costOutput,omitempty"`
	CostCacheRead  *float64  `json:"costCacheRead,omitempty"`
	CostCacheWrite *float64  `json:"costCacheWrite,omitempty"`
	IsOverride     *bool     `json:"isOverride,omitempty"`
	Enabled        *bool     `json:"enabled,omitempty"`
}

// SyncablePricingRule is one entry in a Zeus bulk pricing sync payload.
// isOverride is not caller-supplied; the server always forces it to false.
type SyncablePricingRule struct {
	PostablePricingRule
	SourceID valuer.UUID `json:"sourceId" required:"true"`
}

type SyncPricingRulesRequest struct {
	Rules []SyncablePricingRule `json:"rules" required:"true"`
}

// SyncPricingRulesResponse reports how many rows were affected.
// Synced: non-override rows whose cost fields were updated.
// Refreshed: override rows whose SourceConfig was updated (cost fields preserved).
type SyncPricingRulesResponse struct {
	Synced    int `json:"synced"    required:"true"`
	Refreshed int `json:"refreshed" required:"true"`
}

type ListPricingRulesQuery struct {
	Offset int `query:"offset" json:"offset"`
	Limit  int `query:"limit"  json:"limit"`
}

type ListPricingRulesResponse struct {
	Items  []*GettablePricingRule `json:"items"  required:"true" nullable:"true"`
	Total  int                    `json:"total"  required:"true"`
	Offset int                    `json:"offset" required:"true"`
	Limit  int                    `json:"limit"  required:"true"`
}
