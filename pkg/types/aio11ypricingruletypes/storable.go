package aio11ypricingruletypes

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// StringSlice is a []string that is stored as a JSON text column.
// It is compatible with both SQLite and PostgreSQL.
type StringSlice []string

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
		return errors.NewInternalf(errors.CodeInternal, "aio11ypricingruletypes: cannot scan %T into StringSlice", src)
	}
	return json.Unmarshal(raw, s)
}

// StorablePricingRule is the bun/DB representation of an LLM pricing rule.
type StorablePricingRule struct {
	bun.BaseModel `bun:"table:llm_pricing_rules,alias:llm_pricing_rules"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID          valuer.UUID `bun:"org_id,type:text,notnull"`
	SourceID       valuer.UUID `bun:"source_id,type:text,notnull"`
	Model          string      `bun:"model,type:text,notnull"`
	ModelPattern   StringSlice `bun:"model_pattern,type:text,notnull"`
	Unit           Unit        `bun:"unit,type:text,notnull"`
	CacheMode      CacheMode   `bun:"cache_mode,type:text,notnull"`
	CostInput      float64     `bun:"cost_input,notnull"`
	CostOutput     float64     `bun:"cost_output,notnull"`
	CostCacheRead  float64     `bun:"cost_cache_read,notnull"`
	CostCacheWrite float64     `bun:"cost_cache_write,notnull"`
	// IsOverride marks that cost fields were manually edited.
	// When true the sync job skips this rule.
	IsOverride bool `bun:"is_override,notnull,default:false"`
	// SourceConfig holds the last upstream pricing snapshot; used to revert
	// when IsOverride is cleared.
	SourceConfig string     `bun:"source_config,type:text,notnull,default:'{}'"`
	SyncedAt     *time.Time `bun:"synced_at"`
	Enabled      bool       `bun:"enabled,notnull,default:true"`
}
