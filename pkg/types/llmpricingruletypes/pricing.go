package llmpricingruletypes

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const (
	LLMCostFeatureType agentConf.AgentFeatureType = "llm_pricing"

	GenAIRequestModel                  = "gen_ai.request.model"
	GenAIUsageInputTokens              = "gen_ai.usage.input_tokens"
	GenAIUsageOutputTokens             = "gen_ai.usage.output_tokens"
	GenAIUsageCacheReadInputTokens     = "gen_ai.usage.cache_read.input_tokens"
	GenAIUsageCacheCreationInputTokens = "gen_ai.usage.cache_creation.input_tokens"

	SignozGenAICostInput      = "_signoz.gen_ai.cost_input"
	SignozGenAICostOutput     = "_signoz.gen_ai.cost_output"
	SignozGenAICostCacheRead  = "_signoz.gen_ai.cost_cache_read"
	SignozGenAICostCacheWrite = "_signoz.gen_ai.cost_cache_write"
	SignozGenAITotalCost      = "_signoz.gen_ai.total_cost"
)

var (
	ErrCodePricingRuleAlreadyExists  = errors.MustNewCode("pricing_rule_already_exists")
	ErrCodePricingRuleNotFound       = errors.MustNewCode("pricing_rule_not_found")
	ErrCodePricingRuleInvalidInput   = errors.MustNewCode("pricing_rule_invalid_input")
	ErrCodeInvalidCollectorConfig    = errors.MustNewCode("invalid_collector_config")
	ErrCodeBuildPricingProcessorConf = errors.MustNewCode("build_pricing_processor_config")
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

// StringSlice is a []string that is stored as a JSON text column.
// It is compatible with both SQLite and PostgreSQL.
type StringSlice []string

// LLMRulePricing is the per-rule pricing shape, persisted as a single JSON.
type LLMRulePricing struct {
	Input  float64               `json:"input" required:"true"`
	Output float64               `json:"output" required:"true"`
	Cache  *LLMPricingCacheCosts `json:"cache,omitempty"`
}

type LLMPricingCacheCosts struct {
	Mode  LLMPricingRuleCacheMode `json:"mode" required:"true"`
	Read  float64                 `json:"read"`
	Write float64                 `json:"write"`
}

type LLMPricingRule struct {
	bun.BaseModel `bun:"table:llm_pricing_rule,alias:llm_pricing_rule" json:"-"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID        valuer.UUID        `bun:"org_id,type:text,notnull" json:"orgId" required:"true"`
	SourceID     *valuer.UUID       `bun:"source_id,type:text" json:"sourceId,omitempty"`
	Model        string             `bun:"model,type:text,notnull" json:"modelName" required:"true"`
	Provider     string             `bun:"provider,type:text,notnull" json:"provider" required:"true"`
	ModelPattern StringSlice        `bun:"model_pattern,type:text,notnull" json:"modelPattern" required:"true"`
	Unit         LLMPricingRuleUnit `bun:"unit,type:text,notnull" json:"unit" required:"true"`
	Pricing      LLMRulePricing     `bun:"pricing,type:text,notnull,default:'{}'" json:"pricing" required:"true"`
	// IsOverride marks the row as user-pinned. When true, Zeus skips it entirely.
	IsOverride bool       `bun:"is_override,notnull,default:false" json:"isOverride" required:"true"`
	SyncedAt   *time.Time `bun:"synced_at" json:"syncedAt,omitempty"`
	Enabled    bool       `bun:"enabled,notnull,default:true" json:"enabled" required:"true"`
}

type GettableLLMPricingRule = LLMPricingRule

type StorableLLMPricingRule = LLMPricingRule

// UpdatableLLMPricingRule is one entry in the bulk upsert batch.
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
	ID           *valuer.UUID       `json:"id,omitempty"`
	SourceID     *valuer.UUID       `json:"sourceId,omitempty"`
	Model        string             `json:"modelName" required:"true"`
	Provider     string             `json:"provider" required:"true"`
	ModelPattern []string           `json:"modelPattern" required:"true"`
	Unit         LLMPricingRuleUnit `json:"unit" required:"true"`
	Pricing      LLMRulePricing     `json:"pricing" required:"true"`
	IsOverride   *bool              `json:"isOverride,omitempty"`
	Enabled      bool               `json:"enabled" required:"true"`
}

type UpdatableLLMPricingRules struct {
	Rules []*UpdatableLLMPricingRule `json:"rules" required:"true"`
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

func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return "[]", nil
	}
	b, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (s *StringSlice) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	case nil:
		*s = nil
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "llmpricingruletypes: cannot scan %T into StringSlice", src)
	}
	return json.Unmarshal(raw, s)
}

func (p LLMRulePricing) Value() (driver.Value, error) {
	b, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (p *LLMRulePricing) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	case nil:
		*p = LLMRulePricing{}
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "llmpricingruletypes: cannot scan %T into LLMRulePricing", src)
	}
	return json.Unmarshal(raw, p)
}

func NewGettableLLMPricingRulesFromLLMPricingRules(items []*LLMPricingRule, total, offset, limit int) *GettablePricingRules {
	return &GettablePricingRules{
		Items:  items,
		Total:  total,
		Offset: offset,
		Limit:  limit,
	}
}

func NewLLMPricingRuleFromUpdatable(u *UpdatableLLMPricingRule, orgID valuer.UUID, userEmail string, now time.Time) *LLMPricingRule {
	isOverride := true
	if u.IsOverride != nil {
		isOverride = *u.IsOverride
	} else if u.SourceID != nil {
		isOverride = false
	}

	return &LLMPricingRule{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		UserAuditable: types.UserAuditable{CreatedBy: userEmail, UpdatedBy: userEmail},
		OrgID:         orgID,
		SourceID:      u.SourceID,
		Model:         u.Model,
		Provider:      u.Provider,
		ModelPattern:  StringSlice(u.ModelPattern),
		Unit:          u.Unit,
		Pricing:       u.Pricing,
		IsOverride:    isOverride,
		SyncedAt:      &now,
		Enabled:       u.Enabled,
	}
}

func (r *LLMPricingRule) Update(u *UpdatableLLMPricingRule, userEmail string, now time.Time) {
	if u.IsOverride == nil && r.IsOverride {
		r.SyncedAt = &now
		return
	}

	r.Model = u.Model
	r.Provider = u.Provider
	r.ModelPattern = StringSlice(u.ModelPattern)
	r.Unit = u.Unit
	r.Pricing = u.Pricing
	if u.IsOverride != nil {
		r.IsOverride = *u.IsOverride
	}
	r.Enabled = u.Enabled
	r.SyncedAt = &now
	r.UpdatedAt = now
	r.UpdatedBy = userEmail
}
