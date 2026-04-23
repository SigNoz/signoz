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
// It also doubles as the HTTP response shape; see GettablePricingRule.
type PricingRule struct {
	types.TimeAuditable
	types.UserAuditable

	ID             valuer.UUID  `json:"id" required:"true"`
	OrgID          valuer.UUID  `json:"orgId" required:"true"`
	SourceID       *valuer.UUID `json:"sourceId,omitempty"`
	Model          string       `json:"modelName" required:"true"`
	ModelPattern   []string     `json:"modelPattern" required:"true"`
	Unit           Unit         `json:"unit" required:"true"`
	CacheMode      CacheMode    `json:"cacheMode" required:"true"`
	CostInput      float64      `json:"costInput" required:"true"`
	CostOutput     float64      `json:"costOutput" required:"true"`
	CostCacheRead  float64      `json:"costCacheRead" required:"true"`
	CostCacheWrite float64      `json:"costCacheWrite" required:"true"`
	IsOverride     bool         `json:"isOverride" required:"true"`
	SyncedAt       *time.Time   `json:"syncedAt,omitempty"`
	Enabled        bool         `json:"enabled" required:"true"`
}

// GettablePricingRule is a type alias for PricingRule — the response shape is
// identical to the core type, so per pkg/types conventions we do not mint a
// separate flavor.
type GettablePricingRule = PricingRule

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
type UpdatablePricingRule struct {
	ID             *valuer.UUID `json:"id,omitempty"`
	SourceID       *valuer.UUID `json:"sourceId,omitempty"`
	Model          string       `json:"modelName" required:"true"`
	ModelPattern   []string     `json:"modelPattern" required:"true"`
	Unit           Unit         `json:"unit" required:"true"`
	CacheMode      CacheMode    `json:"cacheMode" required:"true"`
	CostInput      float64      `json:"costInput" required:"true"`
	CostOutput     float64      `json:"costOutput" required:"true"`
	CostCacheRead  float64      `json:"costCacheRead" required:"true"`
	CostCacheWrite float64      `json:"costCacheWrite" required:"true"`
	IsOverride     *bool        `json:"isOverride,omitempty"`
	Enabled        bool         `json:"enabled" required:"true"`
}

type UpdatablePricingRulesRequest struct {
	Rules []UpdatablePricingRule `json:"rules" required:"true"`
}

type UpdatablePricingRulesResponse struct {
	Inserted  int `json:"inserted" required:"true"`
	Updated   int `json:"updated" required:"true"`
	Preserved int `json:"preserved" required:"true"`
}

type ListPricingRulesQuery struct {
	Offset int `query:"offset" json:"offset"`
	Limit  int `query:"limit"  json:"limit"`
}

type GettablePricingRules struct {
	Items  []*GettablePricingRule `json:"items"  required:"true"`
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

func NewPricingRuleFromStorable(s *StorablePricingRule) *PricingRule {
	pattern := make([]string, len(s.ModelPattern))
	copy(pattern, s.ModelPattern)

	return &PricingRule{
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

func NewGettablePricingRulesFromPricingRules(items []*PricingRule, total, offset, limit int) *GettablePricingRules {
	return &GettablePricingRules{
		Items:  items,
		Total:  total,
		Offset: offset,
		Limit:  limit,
	}
}

func NewUpdatablePricingRulesResponse(inserted, updated, preserved int) *UpdatablePricingRulesResponse {
	return &UpdatablePricingRulesResponse{
		Inserted:  inserted,
		Updated:   updated,
		Preserved: preserved,
	}
}
