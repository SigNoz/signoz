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
	// IsOverride marks that cost fields were manually edited.
	// When true the sync job skips this rule.
	IsOverride bool       `json:"isOverride" required:"true"`
	SyncedAt   *time.Time `json:"syncedAt,omitempty"`
	Enabled    bool       `json:"enabled" required:"true"`
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
