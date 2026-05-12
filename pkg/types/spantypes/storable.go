package spantypes

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type StorableSpanMapperGroup struct {
	bun.BaseModel `bun:"table:span_mapper_group,alias:span_attribute_mapping_group"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID     valuer.UUID              `bun:"org_id,type:text,notnull"`
	Name      string                   `bun:"name,type:text,notnull"`
	Condition SpanMapperGroupCondition `bun:"condition,type:jsonb,notnull"`
	Enabled   bool                     `bun:"enabled,notnull,default:true"`
}

type StorableSpanMapper struct {
	bun.BaseModel `bun:"table:span_mapper,alias:span_attribute_mapping"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	GroupID      valuer.UUID      `bun:"group_id,type:text,notnull"`
	Name         string           `bun:"name,type:text,notnull"`
	FieldContext FieldContext     `bun:"field_context,type:text,notnull"`
	Config       SpanMapperConfig `bun:"config,type:jsonb,notnull"`
	Enabled      bool             `bun:"enabled,notnull,default:true"`
}

func (c SpanMapperGroupCondition) Value() (driver.Value, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (c *SpanMapperGroupCondition) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	case nil:
		*c = SpanMapperGroupCondition{}
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "spanmapper: cannot scan %T into Condition", src)
	}
	return json.Unmarshal(raw, c)
}

func (m SpanMapperConfig) Value() (driver.Value, error) {
	b, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (m *SpanMapperConfig) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	case nil:
		*m = SpanMapperConfig{}
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "spanmapper: cannot scan %T into MapperConfig", src)
	}
	return json.Unmarshal(raw, m)
}
