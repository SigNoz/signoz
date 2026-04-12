package aio11ypricingruletypes

import "time"

// GettablePricingRule is the HTTP response representation of a pricing rule.
type GettablePricingRule struct {
	ID             string     `json:"id"               required:"true"`
	Model          string     `json:"model_name"       required:"true"`
	ModelPattern   []string   `json:"model_pattern"    required:"true"`
	Unit           Unit       `json:"unit"             required:"true"`
	CacheMode      CacheMode  `json:"cache_mode"       required:"true"`
	CostInput      float64    `json:"cost_input"       required:"true"`
	CostOutput     float64    `json:"cost_output"      required:"true"`
	CostCacheRead  float64    `json:"cost_cache_read"  required:"true"`
	CostCacheWrite float64    `json:"cost_cache_write" required:"true"`
	IsOverride     bool       `json:"is_override"      required:"true"`
	SyncedAt       *time.Time `json:"synced_at,omitempty"`
	Enabled        bool       `json:"enabled"          required:"true"`
	CreatedAt      time.Time  `json:"created_at"       required:"true"`
	UpdatedAt      time.Time  `json:"updated_at"       required:"true"`
	CreatedBy      string     `json:"created_by"       required:"true"`
	UpdatedBy      string     `json:"updated_by"       required:"true"`
}

// NewGettablePricingRule converts a domain PricingRule to a GettablePricingRule.
func NewGettablePricingRule(r *PricingRule) *GettablePricingRule {
	pattern := make([]string, len(r.ModelPattern))
	copy(pattern, r.ModelPattern)

	return &GettablePricingRule{
		ID:             r.ID,
		Model:          r.Model,
		ModelPattern:   pattern,
		Unit:           r.Unit,
		CacheMode:      r.CacheMode,
		CostInput:      r.CostInput,
		CostOutput:     r.CostOutput,
		CostCacheRead:  r.CostCacheRead,
		CostCacheWrite: r.CostCacheWrite,
		IsOverride:     r.IsOverride,
		SyncedAt:       r.SyncedAt,
		Enabled:        r.Enabled,
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
		CreatedBy:      r.CreatedBy,
		UpdatedBy:      r.UpdatedBy,
	}
}

// PostablePricingRule is the HTTP request body for creating a pricing rule.
// All fields are required.
type PostablePricingRule struct {
	Model          string    `json:"model_name"       required:"true"`
	ModelPattern   []string  `json:"model_pattern"    required:"true"`
	Unit           Unit      `json:"unit"             required:"true"`
	CacheMode      CacheMode `json:"cache_mode"       required:"true"`
	CostInput      float64   `json:"cost_input"       required:"true"`
	CostOutput     float64   `json:"cost_output"      required:"true"`
	CostCacheRead  float64   `json:"cost_cache_read"  required:"true"`
	CostCacheWrite float64   `json:"cost_cache_write" required:"true"`
	Enabled        bool      `json:"enabled"          required:"true"`
}

// UpdatablePricingRule is the HTTP request body for updating a pricing rule.
// All fields are optional; only non-nil fields are applied.
type UpdatablePricingRule struct {
	Model          *string    `json:"model_name,omitempty"`
	ModelPattern   []string   `json:"model_pattern,omitempty"`
	Unit           *Unit      `json:"unit,omitempty"`
	CacheMode      *CacheMode `json:"cache_mode,omitempty"`
	CostInput      *float64   `json:"cost_input,omitempty"`
	CostOutput     *float64   `json:"cost_output,omitempty"`
	CostCacheRead  *float64   `json:"cost_cache_read,omitempty"`
	CostCacheWrite *float64   `json:"cost_cache_write,omitempty"`
	IsOverride     *bool      `json:"is_override,omitempty"`
	Enabled        *bool      `json:"enabled,omitempty"`
}

// ListPricingRulesQuery holds the pagination parameters for listing pricing rules.
type ListPricingRulesQuery struct {
	Offset int `query:"offset" json:"offset"`
	Limit  int `query:"limit"  json:"limit"`
}

// ListPricingRulesResponse is the paginated response for listing pricing rules.
type ListPricingRulesResponse struct {
	Items  []*GettablePricingRule `json:"items"  required:"true" nullable:"true"`
	Total  int                    `json:"total"  required:"true"`
	Offset int                    `json:"offset" required:"true"`
	Limit  int                    `json:"limit"  required:"true"`
}
