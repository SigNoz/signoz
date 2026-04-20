package spanattributemappingtypes

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

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
	// Key is the span/resource attribute key to read from.
	Key string `json:"key"`
	// Context indicates whether to read from span attributes or resource attributes.
	Context FieldContext `json:"context"`
	// Operation determines whether to move or copy the source value.
	Operation MapperOperation `json:"operation"`
	// Priority controls the evaluation order; lower value = higher priority.
	Priority int `json:"priority"`
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
		return fmt.Errorf("spanattributemapping: cannot scan %T into MapperConfig", src)
	}
	return json.Unmarshal(raw, m)
}

// Mapper is the domain model for a span attribute mapper.
type SpanAttributeMapper struct {
	types.TimeAuditable
	types.UserAuditable

	ID           valuer.UUID  `json:"id"            required:"true"`
	GroupID      valuer.UUID  `json:"group_id"      required:"true"`
	Name         string       `json:"name"          required:"true"`
	FieldContext FieldContext `json:"field_context" required:"true"`
	Config       MapperConfig `json:"config"        required:"true"`
	Enabled      bool         `json:"enabled"       required:"true"`
}

// NewMapperFromStorable converts a StorableMapper to a Mapper.
func NewMapperFromStorable(s *StorableSpanAttributeMapper) *SpanAttributeMapper {
	return &SpanAttributeMapper{
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

// NewMappersFromStorable converts a slice of StorableMapper to a slice of Mapper.
func NewMappersFromStorable(ss []*StorableSpanAttributeMapper) []*SpanAttributeMapper {
	mappers := make([]*SpanAttributeMapper, len(ss))
	for i, s := range ss {
		mappers[i] = NewMapperFromStorable(s)
	}
	return mappers
}

// GettableMapper is the HTTP response representation of a mapper.
type GettableSpanAttributeMapper = SpanAttributeMapper

// NewGettableMapper converts a domain Mapper to a GettableMapper.
func NewGettableMapper(m *SpanAttributeMapper) *GettableSpanAttributeMapper {
	return m
}

// PostableMapper is the HTTP request body for creating a mapper.
type PostableSpanAttributeMapper struct {
	Name         string       `json:"name"          required:"true"`
	FieldContext FieldContext `json:"field_context" required:"true"`
	Config       MapperConfig `json:"config"        required:"true"`
	Enabled      bool         `json:"enabled"`
}

// UpdatableMapper is the HTTP request body for updating a mapper.
// All fields are optional; only non-nil fields are applied.
type UpdatableSpanAttributeMapper struct {
	FieldContext *FieldContext `json:"field_context,omitempty"`
	Config       *MapperConfig `json:"config,omitempty"`
	Enabled      *bool         `json:"enabled,omitempty"`
}

// ListMappersResponse is the response for listing mappers within a group.
type ListSpanAttributeMappersResponse struct {
	Items []*GettableSpanAttributeMapper `json:"items" required:"true" nullable:"true"`
}
