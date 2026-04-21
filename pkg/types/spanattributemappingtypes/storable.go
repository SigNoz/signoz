package spanattributemappingtypes

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type StorableGroup struct {
	bun.BaseModel `bun:"table:span_attribute_mapping_group,alias:span_attribute_mapping_group"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID     valuer.UUID   `bun:"org_id,type:text,notnull"`
	Name      string        `bun:"name,type:text,notnull"`
	Category  GroupCategory `bun:"category,type:text,notnull"`
	Condition Condition     `bun:"condition,type:jsob,notnull"`
	Enabled   bool          `bun:"enabled,notnull,default:true"`
}

type StorableMapper struct {
	bun.BaseModel `bun:"table:span_attribute_mapping,alias:span_attribute_mapping"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	GroupID      valuer.UUID  `bun:"group_id,type:text,notnull"`
	Name         string       `bun:"name,type:text,notnull"`
	FieldContext FieldContext `bun:"field_context,type:text,notnull"`
	Config       MapperConfig `bun:"config,type:jsonb,notnull"`
	Enabled      bool         `bun:"enabled,notnull,default:true"`
}
