package aio11ymappingtypes

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// StorableMappingGroup is the bun/DB representation of a span attribute mapping group.
type StorableMappingGroup struct {
	bun.BaseModel `bun:"table:span_attribute_mapping_group,alias:span_attribute_mapping_group"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID     valuer.UUID   `bun:"org_id,type:text,notnull"`
	Name      string        `bun:"name,type:text,notnull"`
	Category  GroupCategory `bun:"category,type:text,notnull"`
	Condition Condition     `bun:"condition,type:text,notnull"`
	Enabled   bool          `bun:"enabled,notnull,default:true"`
}

// StorableMapper is the bun/DB representation of a span attribute mapper.
type StorableMapper struct {
	bun.BaseModel `bun:"table:span_mapping_attribute,alias:span_mapping_attribute"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID        valuer.UUID  `bun:"org_id,type:text,notnull"`
	GroupID      valuer.UUID  `bun:"group_id,type:text,notnull"`
	Name         string       `bun:"name,type:text,notnull"`
	FieldContext FieldContext  `bun:"field_context,type:text,notnull"`
	Config       MapperConfig `bun:"config,type:text,notnull"`
	Enabled      bool         `bun:"enabled,notnull,default:true"`
}
