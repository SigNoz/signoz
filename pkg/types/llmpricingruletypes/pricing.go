package llmpricingruletypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodePricingRuleNotFound     = errors.MustNewCode("pricing_rule_not_found")
	ErrCodePricingRuleInvalidInput = errors.MustNewCode("pricing_rule_invalid_input")
)

type LLMPricingRuleUnit struct {
	valuer.String
}

var (
	UnitPerMillionTokens = LLMPricingRuleUnit{valuer.NewString("per_million_tokens")}
)

type LLMPricingRuleCacheMode struct {
	valuer.String
}

var (
	// LLMPricingRuleCacheModeSubtract: cached tokens are inside input_tokens (OpenAI-style).
	LLMPricingRuleCacheModeSubtract = LLMPricingRuleCacheMode{valuer.NewString("subtract")}
	// LLMPricingRuleCacheModeAdditive: cached tokens are reported separately (Anthropic-style).
	LLMPricingRuleCacheModeAdditive = LLMPricingRuleCacheMode{valuer.NewString("additive")}
	// LLMPricingRuleCacheModeUnknown: provider behaviour is unknown; falls back to subtract.
	LLMPricingRuleCacheModeUnknown = LLMPricingRuleCacheMode{valuer.NewString("unknown")}
)

// LLMPricingRule is the domain model for an LLM pricing rule.
// It also doubles as the HTTP response shape; see GettablePricingRule.
type LLMPricingRule struct {
	types.TimeAuditable
	types.UserAuditable

	ID             valuer.UUID             `json:"id" required:"true"`
	OrgID          valuer.UUID             `json:"orgId" required:"true"`
	SourceID       *valuer.UUID            `json:"sourceId,omitempty"`
	Model          string                  `json:"modelName" required:"true"`
	ModelPattern   []string                `json:"modelPattern" required:"true"`
	Unit           LLMPricingRuleUnit      `json:"unit" required:"true"`
	CacheMode      LLMPricingRuleCacheMode `json:"cacheMode" required:"true"`
	CostInput      float64                 `json:"costInput" required:"true"`
	CostOutput     float64                 `json:"costOutput" required:"true"`
	CostCacheRead  float64                 `json:"costCacheRead" required:"true"`
	CostCacheWrite float64                 `json:"costCacheWrite" required:"true"`
	IsOverride     bool                    `json:"isOverride" required:"true"`
	SyncedAt       *time.Time              `json:"syncedAt,omitempty"`
	Enabled        bool                    `json:"enabled" required:"true"`
}

// GettablePricingRule is a type alias for PricingRule — the response shape is
// identical to the core type, so per pkg/types conventions we do not mint a
// separate flavor.
type GettableLLMPricingRule = LLMPricingRule

// UpdatablePricingRule is one entry in the bulk upsert batch.
//
// Identification:
//   - ID set       → match by id (user editing a known row).
//   - SourceID set → match by source_id (Zeus sync, or user editing a Zeus-synced row).
//   - neither set  → insert a new row with source_id = NULL (user-created custom rule).
//
// IsOverride is a pointer so the caller can distinguish "not sent" from "set to false".
// When IsOverride is nil AND the matched row has is_override = true, the row is fully
// preserved — only synced_at is stamped.
type UpdatableLLMPricingRule struct {
	ID             *valuer.UUID            `json:"id,omitempty"`
	SourceID       *valuer.UUID            `json:"sourceId,omitempty"`
	Model          string                  `json:"modelName" required:"true"`
	ModelPattern   []string                `json:"modelPattern" required:"true"`
	Unit           LLMPricingRuleUnit      `json:"unit" required:"true"`
	CacheMode      LLMPricingRuleCacheMode `json:"cacheMode" required:"true"`
	CostInput      float64                 `json:"costInput" required:"true"`
	CostOutput     float64                 `json:"costOutput" required:"true"`
	CostCacheRead  float64                 `json:"costCacheRead" required:"true"`
	CostCacheWrite float64                 `json:"costCacheWrite" required:"true"`
	IsOverride     *bool                   `json:"isOverride,omitempty"`
	Enabled        bool                    `json:"enabled" required:"true"`
}

type UpdatableLLMPricingRules struct {
	Rules []UpdatableLLMPricingRule `json:"rules" required:"true"`
}

type ListPricingRulesQuery struct {
	Offset int `query:"offset" json:"offset"`
	Limit  int `query:"limit"  json:"limit"`
}

type GettablePricingRules struct {
	Items  []*GettableLLMPricingRule `json:"items"  required:"true"`
	Total  int                       `json:"total"  required:"true"`
	Offset int                       `json:"offset" required:"true"`
	Limit  int                       `json:"limit"  required:"true"`
}

func (LLMPricingRuleUnit) Enum() []any {
	return []any{UnitPerMillionTokens}
}

func (LLMPricingRuleCacheMode) Enum() []any {
	return []any{LLMPricingRuleCacheModeSubtract, LLMPricingRuleCacheModeAdditive, LLMPricingRuleCacheModeUnknown}
}

func NewLLMPricingRuleFromStorable(s *StorableLLMPricingRule) *LLMPricingRule {
	pattern := make([]string, len(s.ModelPattern))
	copy(pattern, s.ModelPattern)

	return &LLMPricingRule{
		TimeAuditable:  s.TimeAuditable,
		UserAuditable:  s.UserAuditable,
		ID:             s.ID,
		OrgID:          s.OrgID,
		SourceID:       s.SourceID,
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

func NewGettableLLMPricingRulesFromLLMPricingRules(items []*LLMPricingRule, total, offset, limit int) *GettablePricingRules {
	return &GettablePricingRules{
		Items:  items,
		Total:  total,
		Offset: offset,
		Limit:  limit,
	}
}
