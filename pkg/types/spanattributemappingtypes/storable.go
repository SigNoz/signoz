package spanattributemappingtypes

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
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

func (c Condition) Value() (driver.Value, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (c *Condition) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	case nil:
		*c = Condition{}
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "spanattributemappingtypes: cannot scan %T into Condition", src)
	}
	return json.Unmarshal(raw, c)
}

func (m MapperConfig) Value() (driver.Value, error) {
	b, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (m *MapperConfig) Scan(src any) error {
	var raw []byte
	switch v := src.(type) {
	case string:
		raw = []byte(v)
	case []byte:
		raw = v
	case nil:
		*m = MapperConfig{}
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "spanattributemapping: cannot scan %T into MapperConfig", src)
	}
	return json.Unmarshal(raw, m)
}
