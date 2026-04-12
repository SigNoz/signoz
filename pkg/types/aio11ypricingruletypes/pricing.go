package aio11ypricingruletypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Unit string

const (
	UnitPerMillionTokens Unit = "per_million_tokens"
)

func (Unit) Enum() []any {
	return []any{UnitPerMillionTokens}
}

type CacheMode string

const (
	// CacheModeSubtract: cached tokens are inside input_tokens (OpenAI-style).
	CacheModeSubtract CacheMode = "subtract"
	// CacheModeAdditive: cached tokens are reported separately (Anthropic-style).
	CacheModeAdditive CacheMode = "additive"
	// CacheModeUnknown: provider behaviour is unknown; falls back to subtract.
	CacheModeUnknown CacheMode = "unknown"
)

func (CacheMode) Enum() []any {
	return []any{CacheModeSubtract, CacheModeAdditive, CacheModeUnknown}
}

// PricingRule is the domain model for an LLM pricing rule.
// It has no serialisation concerns — use GettablePricingRule for HTTP responses.
type PricingRule struct {
	types.TimeAuditable
	types.UserAuditable

	ID             string
	OrgID          valuer.UUID
	Model          string
	ModelPattern   []string
	Unit           Unit
	CacheMode      CacheMode
	CostInput      float64
	CostOutput     float64
	CostCacheRead  float64
	CostCacheWrite float64
	// IsOverride marks that cost fields were manually edited.
	// When true the sync job skips this rule.
	IsOverride bool
	SyncedAt   *time.Time
	Enabled    bool
}

// NewPricingRuleFromStorable converts a StorablePricingRule to a PricingRule.
func NewPricingRuleFromStorable(s *StorablePricingRule) *PricingRule {
	pattern := make([]string, len(s.ModelPattern))
	copy(pattern, s.ModelPattern)

	return &PricingRule{
		TimeAuditable:  s.TimeAuditable,
		UserAuditable:  s.UserAuditable,
		ID:             s.ID.StringValue(),
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
