package aio11ymappingtypes

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// FieldContext is where the target attribute is written.
type FieldContext string

const (
	FieldContextSpanAttribute FieldContext = "span_attribute"
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

// SourceContext indicates whether the source key is read from span attributes or resource attributes.
type SourceContext string

const (
	SourceContextAttribute SourceContext = "attribute"
	SourceContextResource  SourceContext = "resource"
)

func (SourceContext) Enum() []any {
	return []any{SourceContextAttribute, SourceContextResource}
}

// MapperSource describes one candidate source for a target attribute.
type MapperSource struct {
	// Key is the span/resource attribute key to read from.
	Key string `json:"key"`
	// Context indicates whether to read from span attributes or resource attributes.
	Context SourceContext `json:"context"`
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
		return fmt.Errorf("aio11ymappingtypes: cannot scan %T into MapperConfig", src)
	}
	return json.Unmarshal(raw, m)
}

// Mapper is the domain model for a span attribute mapper.
type Mapper struct {
	types.TimeAuditable
	types.UserAuditable

	ID           string
	OrgID        valuer.UUID
	GroupID      valuer.UUID
	Name         string
	FieldContext FieldContext
	Config       MapperConfig
	Enabled      bool
}

// NewMapperFromStorable converts a StorableMapper to a Mapper.
func NewMapperFromStorable(s *StorableMapper) *Mapper {
	return &Mapper{
		TimeAuditable: s.TimeAuditable,
		UserAuditable: s.UserAuditable,
		ID:            s.ID.StringValue(),
		OrgID:         s.OrgID,
		GroupID:       s.GroupID,
		Name:          s.Name,
		FieldContext:  s.FieldContext,
		Config:        s.Config,
		Enabled:       s.Enabled,
	}
}

// NewMappersFromStorable converts a slice of StorableMapper to a slice of Mapper.
func NewMappersFromStorable(ss []*StorableMapper) []*Mapper {
	mappers := make([]*Mapper, len(ss))
	for i, s := range ss {
		mappers[i] = NewMapperFromStorable(s)
	}
	return mappers
}

// GettableMapper is the HTTP response representation of a mapper.
type GettableMapper struct {
	ID           string       `json:"id"            required:"true"`
	GroupID      string       `json:"group_id"      required:"true"`
	Name         string       `json:"name"          required:"true"`
	FieldContext FieldContext `json:"field_context" required:"true"`
	Config       MapperConfig `json:"config"        required:"true"`
	Enabled      bool         `json:"enabled"       required:"true"`
	CreatedAt    time.Time    `json:"created_at"    required:"true"`
	UpdatedAt    time.Time    `json:"updated_at"    required:"true"`
	CreatedBy    string       `json:"created_by"    required:"true"`
	UpdatedBy    string       `json:"updated_by"    required:"true"`
}

// NewGettableMapper converts a domain Mapper to a GettableMapper.
func NewGettableMapper(m *Mapper) *GettableMapper {
	return &GettableMapper{
		ID:           m.ID,
		GroupID:      m.GroupID.StringValue(),
		Name:         m.Name,
		FieldContext: m.FieldContext,
		Config:       m.Config,
		Enabled:      m.Enabled,
		CreatedAt:    m.CreatedAt,
		UpdatedAt:    m.UpdatedAt,
		CreatedBy:    m.CreatedBy,
		UpdatedBy:    m.UpdatedBy,
	}
}

// PostableMapper is the HTTP request body for creating a mapper.
type PostableMapper struct {
	Name         string       `json:"name"          required:"true"`
	FieldContext FieldContext `json:"field_context" required:"true"`
	Config       MapperConfig `json:"config"        required:"true"`
	Enabled      bool         `json:"enabled"`
}

// UpdatableMapper is the HTTP request body for updating a mapper.
// All fields are optional; only non-nil fields are applied.
type UpdatableMapper struct {
	FieldContext *FieldContext `json:"field_context,omitempty"`
	Config       *MapperConfig `json:"config,omitempty"`
	Enabled      *bool         `json:"enabled,omitempty"`
}

// ListMappersQuery holds optional filter parameters for listing mappers in a group.
type ListMappersQuery struct {
	Enabled *bool `query:"enabled"`
}

// ListMappersResponse is the response for listing mappers within a group.
type ListMappersResponse struct {
	Items []*GettableMapper `json:"items" required:"true" nullable:"true"`
}
