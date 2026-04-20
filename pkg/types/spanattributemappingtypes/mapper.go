package spanattributemappingtypes

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// FieldContext is where the target attribute is written.
type FieldContext string

const (
	FieldContextSpanAttribute FieldContext = "attribute"
	FieldContextResource      FieldContext = "resource"
)

func (FieldContext) Enum() []any {
	return []any{FieldContextSpanAttribute, FieldContextResource}
}

// MapperOperation determines whether the source attribute is moved (deleted) or copied.
type MapperOperation string

const (
	MapperOperationMove MapperOperation = "move"
	MapperOperationCopy MapperOperation = "copy"
)

func (MapperOperation) Enum() []any {
	return []any{MapperOperationMove, MapperOperationCopy}
}

// MapperSource describes one candidate source for a target attribute.
type MapperSource struct {
	Key       string          `json:"key"`
	Context   FieldContext    `json:"context"`
	Operation MapperOperation `json:"operation"`
	Priority  int             `json:"priority"`
}

// MapperConfig holds the mapping logic for a single target attribute.
// It implements driver.Valuer and sql.Scanner for JSON text column storage.
type MapperConfig struct {
	Sources []MapperSource `json:"sources"`
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

// Mapper is the domain model for a span attribute mapper.
type Mapper struct {
	types.TimeAuditable
	types.UserAuditable

	ID           valuer.UUID  `json:"id"            required:"true"`
	GroupID      valuer.UUID  `json:"group_id"      required:"true"`
	Name         string       `json:"name"          required:"true"`
	FieldContext FieldContext `json:"field_context" required:"true"`
	Config       MapperConfig `json:"config"        required:"true"`
	Enabled      bool         `json:"enabled"       required:"true"`
}

func NewMapperFromStorable(s *StorableMapper) *Mapper {
	return &Mapper{
		TimeAuditable: s.TimeAuditable,
		UserAuditable: s.UserAuditable,
		ID:            s.ID,
		GroupID:       s.GroupID,
		Name:          s.Name,
		FieldContext:  s.FieldContext,
		Config:        s.Config,
		Enabled:       s.Enabled,
	}
}

func NewMappersFromStorable(ss []*StorableMapper) []*Mapper {
	mappers := make([]*Mapper, len(ss))
	for i, s := range ss {
		mappers[i] = NewMapperFromStorable(s)
	}
	return mappers
}

type GettableMapper = Mapper

func NewGettableMapper(m *Mapper) *GettableMapper {
	return m
}

type PostableMapper struct {
	Name         string       `json:"name"          required:"true"`
	FieldContext FieldContext `json:"field_context" required:"true"`
	Config       MapperConfig `json:"config"        required:"true"`
	Enabled      bool         `json:"enabled"`
}

// UpdatableMapper is the HTTP request body for updating a mapper.
// All fields are optional; only non-nil fields are applied.
type UpdatableMapper struct {
	FieldContext FieldContext  `json:"field_context,omitempty"`
	Config       *MapperConfig `json:"config,omitempty"`
	Enabled      *bool         `json:"enabled,omitempty"`
}

type ListMappersResponse struct {
	Items []*GettableMapper `json:"items" required:"true" nullable:"true"`
}
