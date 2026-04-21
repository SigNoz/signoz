package spanattributemappingtypes

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeMapperNotFound      = errors.MustNewCode("span_attribute_mapper_not_found")
	ErrCodeMapperAlreadyExists = errors.MustNewCode("span_attribute_mapper_already_exists")
	ErrCodeMappingInvalidInput = errors.MustNewCode("span_attribute_mapping_invalid_input")
)

// FieldContext is where the target attribute is written.
type FieldContext struct {
	valuer.String
}

var (
	FieldContextSpanAttribute = FieldContext{valuer.NewString("attribute")}
	FieldContextResource      = FieldContext{valuer.NewString("resource")}
)

// MapperOperation determines whether the source attribute is moved (deleted) or copied.
type MapperOperation struct {
	valuer.String
}

var (
	MapperOperationMove = MapperOperation{valuer.NewString("move")}
	MapperOperationCopy = MapperOperation{valuer.NewString("copy")}
)

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

type GettableMapper = Mapper

type GettableMappers struct {
	Items []*GettableMapper `json:"items" required:"true" nullable:"false"`
}

func (FieldContext) Enum() []any {
	return []any{FieldContextSpanAttribute, FieldContextResource}
}

func (MapperOperation) Enum() []any {
	return []any{MapperOperationMove, MapperOperationCopy}
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

func NewMapperFromPostable(req *PostableMapper) *Mapper {
	return &Mapper{
		Name:         req.Name,
		FieldContext: req.FieldContext,
		Config:       req.Config,
		Enabled:      req.Enabled,
	}
}

func NewMapperFromUpdatable(req *UpdatableMapper) *Mapper {
	m := &Mapper{}
	if req.FieldContext != (FieldContext{}) {
		m.FieldContext = req.FieldContext
	}
	if req.Config != nil {
		m.Config = *req.Config
	}
	if req.Enabled != nil {
		m.Enabled = *req.Enabled
	}
	return m
}

func NewMappersFromStorable(ss []*StorableMapper) []*Mapper {
	mappers := make([]*Mapper, len(ss))
	for i, s := range ss {
		mappers[i] = NewMapperFromStorable(s)
	}
	return mappers
}

func NewGettableMappers(m []*Mapper) *GettableMappers {
	return &GettableMappers{Items: m}
}
