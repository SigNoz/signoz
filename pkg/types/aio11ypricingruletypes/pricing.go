package aio11ypricingruletypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodePricingRuleNotFound      = errors.MustNewCode("pricing_rule_not_found")
	ErrCodePricingRuleAlreadyExists = errors.MustNewCode("pricing_rule_already_exists")
	ErrCodePricingRuleInvalidInput  = errors.MustNewCode("pricing_rule_invalid_input")
)

type Unit struct {
	valuer.String
}

var (
	UnitPerMillionTokens = Unit{valuer.NewString("per_million_tokens")}
)

type CacheMode struct {
	valuer.String
}

var (
	// CacheModeSubtract: cached tokens are inside input_tokens (OpenAI-style).
	CacheModeSubtract = CacheMode{valuer.NewString("subtract")}
	// CacheModeAdditive: cached tokens are reported separately (Anthropic-style).
	CacheModeAdditive = CacheMode{valuer.NewString("additive")}
	// CacheModeUnknown: provider behaviour is unknown; falls back to subtract.
	CacheModeUnknown = CacheMode{valuer.NewString("unknown")}
)

// PricingRule is the domain model for an LLM pricing rule.
// It has no serialisation concerns — use GettablePricingRule for HTTP responses.
type PricingRule struct {
	types.TimeAuditable
	types.UserAuditable

	ID             valuer.UUID
	OrgID          valuer.UUID
	SourceID       valuer.UUID
	Model          string
	ModelPattern   []string
	Unit           Unit
	CacheMode      CacheMode
	CostInput      float64
	CostOutput     float64
	CostCacheRead  float64
	CostCacheWrite float64
	IsOverride     bool
	SyncedAt       *time.Time
	Enabled        bool
}

// GettablePricingRule doesn't have source id as in PricingRule
type GettablePricingRule struct {
	types.TimeAuditable
	types.UserAuditable

	ID             valuer.UUID `json:"id" required:"true"`
	OrgID          valuer.UUID `json:"orgId" required:"true"`
	Model          string      `json:"model" required:"true"`
	ModelPattern   []string    `json:"modelPattern" required:"true"`
	Unit           Unit        `json:"unit" required:"true"`
	CacheMode      CacheMode   `json:"cacheMode" required:"true"`
	CostInput      float64     `json:"costInput" required:"true"`
	CostOutput     float64     `json:"costOutput" required:"true"`
	CostCacheRead  float64     `json:"costCacheRead" required:"true"`
	CostCacheWrite float64     `json:"costCacheWrite" required:"true"`
	IsOverride     bool        `json:"isOverride" required:"true"`
	SyncedAt       *time.Time  `json:"syncedAt,omitempty"`
	Enabled        bool        `json:"enabled" required:"true"`
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

type SyncPricingRulesRequest struct {
	Rules []PricingRule `json:"rules" required:"true"`
}

type ListPricingRulesQuery struct {
	Offset int `query:"offset" json:"offset"`
	Limit  int `query:"limit"  json:"limit"`
}

type GettablePricingRules struct {
	Items  []*GettablePricingRule `json:"items"  required:"true" nullable:"true"`
	Total  int                    `json:"total"  required:"true"`
	Offset int                    `json:"offset" required:"true"`
	Limit  int                    `json:"limit"  required:"true"`
}

func (Unit) Enum() []any {
	return []any{UnitPerMillionTokens}
}

func (CacheMode) Enum() []any {
	return []any{CacheModeSubtract, CacheModeAdditive, CacheModeUnknown}
}

func NewGettablePricingRule(r *PricingRule) *GettablePricingRule {
	return &GettablePricingRule{
		TimeAuditable:  r.TimeAuditable,
		UserAuditable:  r.UserAuditable,
		ID:             r.ID,
		OrgID:          r.OrgID,
		Model:          r.Model,
		ModelPattern:   r.ModelPattern,
		Unit:           r.Unit,
		CacheMode:      r.CacheMode,
		CostInput:      r.CostInput,
		CostOutput:     r.CostOutput,
		CostCacheRead:  r.CostCacheRead,
		CostCacheWrite: r.CostCacheWrite,
		IsOverride:     r.IsOverride,
		SyncedAt:       r.SyncedAt,
		Enabled:        r.Enabled,
	}
}

// NewPricingRuleFromStorable converts a StorablePricingRule to a PricingRule.
func NewPricingRuleFromStorable(s *StorablePricingRule) *PricingRule {
	pattern := make([]string, len(s.ModelPattern))
	copy(pattern, s.ModelPattern)

	return &PricingRule{
		TimeAuditable:  s.TimeAuditable,
		UserAuditable:  s.UserAuditable,
		ID:             s.ID,
		OrgID:          s.OrgID,
		Model:          s.Model,
		ModelPattern:   pattern,
		Unit:           s.Unit,
		CacheMode:      s.CacheMode,
		CostInput:      s.CostInput,
		CostOutput:     s.CostOutput,
		CostCacheRead:  s.CostCacheRead,
		CostCacheWrite: s.CostCacheWrite,
		IsOverride:     s.IsOverride,
		SyncedAt:       s.SyncedAt,
		Enabled:        s.Enabled,
	}
}

func NewPricingRuleFromPostable(p *PostablePricingRule) *PricingRule {
	return &PricingRule{
		Model:          p.Model,
		ModelPattern:   p.ModelPattern,
		Unit:           p.Unit,
		CacheMode:      p.CacheMode,
		CostInput:      p.CostInput,
		CostOutput:     p.CostOutput,
		CostCacheRead:  p.CostCacheRead,
		CostCacheWrite: p.CostCacheWrite,
		Enabled:        p.Enabled,
	}
}

func NewPricingRuleFromUpdatable(u *UpdatablePricingRule) *PricingRule {
	r := &PricingRule{}
	if u.Model != nil {
		r.Model = *u.Model
	}
	if u.ModelPattern != nil {
		r.ModelPattern = u.ModelPattern
	}
	if u.Unit != (Unit{}) {
		r.Unit = u.Unit
	}
	if u.CacheMode != (CacheMode{}) {
		r.CacheMode = u.CacheMode
	}
	if u.CostInput != nil {
		r.CostInput = *u.CostInput
	}
	if u.CostOutput != nil {
		r.CostOutput = *u.CostOutput
	}
	if u.CostCacheRead != nil {
		r.CostCacheRead = *u.CostCacheRead
	}
	if u.CostCacheWrite != nil {
		r.CostCacheWrite = *u.CostCacheWrite
	}
	if u.IsOverride != nil {
		r.IsOverride = *u.IsOverride
	}
	if u.Enabled != nil {
		r.Enabled = *u.Enabled
	}
	return r
}

func NewGettablePricingRulesFromPricingRules(items []*PricingRule, total, offset, limit int) *GettablePricingRules {
	gettableItems := make([]*GettablePricingRule, len(items))
	for i, r := range items {
		gettableItems[i] = NewGettablePricingRule(r)
	}
	return &GettablePricingRules{
		Items:  gettableItems,
		Total:  total,
		Offset: offset,
		Limit:  limit,
	}
}
