package spantypes

import (
	"time"

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
type SpanMapperOperation struct {
	valuer.String
}

var (
	SpanMapperOperationMove = SpanMapperOperation{valuer.NewString("move")}
	SpanMapperOperationCopy = SpanMapperOperation{valuer.NewString("copy")}
)

// MapperSource describes one candidate source for a target attribute.
type SpanMapperSource struct {
	Key       string              `json:"key" required:"true"`
	Context   FieldContext        `json:"context" required:"true"`
	Operation SpanMapperOperation `json:"operation" required:"true"`
	Priority  int                 `json:"priority" required:"true"`
}

// MapperConfig holds the mapping logic for a single target attribute.
// It implements driver.Valuer and sql.Scanner for JSON text column storage.
type SpanMapperConfig struct {
	Sources []SpanMapperSource `json:"sources" required:"true" nullable:"true"`
}

// SpanMapper is the domain model for a span attribute mapper.
type SpanMapper struct {
	types.TimeAuditable
	types.UserAuditable

	ID           valuer.UUID      `json:"id"            required:"true"`
	GroupID      valuer.UUID      `json:"group_id"      required:"true"`
	Name         string           `json:"name"          required:"true"`
	FieldContext FieldContext     `json:"fieldContext"  required:"true"`
	Config       SpanMapperConfig `json:"config"        required:"true"`
	Enabled      bool             `json:"enabled"       required:"true"`
}

type PostableSpanMapper struct {
	Name         string           `json:"name"          required:"true"`
	FieldContext FieldContext     `json:"fieldContext" required:"true"`
	Config       SpanMapperConfig `json:"config"        required:"true"`
	Enabled      bool             `json:"enabled"`
}

// UpdatableSpanMapper is the HTTP request body for updating a span mapper.
// All fields are optional; only non-nil fields are applied.
type UpdatableSpanMapper struct {
	FieldContext FieldContext      `json:"fieldContext"`
	Config       *SpanMapperConfig `json:"config"`
	Enabled      *bool             `json:"enabled"`
}

type GettableSpanMapper = SpanMapper

type GettableSpanMappers struct {
	Items []*GettableSpanMapper `json:"items" required:"true" nullable:"false"`
}

func (FieldContext) Enum() []any {
	return []any{FieldContextSpanAttribute, FieldContextResource}
}

func (SpanMapperOperation) Enum() []any {
	return []any{SpanMapperOperationMove, SpanMapperOperationCopy}
}

func NewSpanMapper(groupID valuer.UUID, createdBy string, p *PostableSpanMapper) *SpanMapper {
	now := time.Now()
	return &SpanMapper{
		ID:           valuer.GenerateUUID(),
		GroupID:      groupID,
		Name:         p.Name,
		FieldContext: p.FieldContext,
		Config:       p.Config,
		Enabled:      p.Enabled,
		TimeAuditable: types.TimeAuditable{
			CreatedAt: now,
			UpdatedAt: now,
		},
		UserAuditable: types.UserAuditable{
			CreatedBy: createdBy,
			UpdatedBy: createdBy,
		},
	}
}

func (m *SpanMapper) Update(fieldContext FieldContext, config *SpanMapperConfig, enabled *bool, updatedBy string) {
	m.FieldContext = fieldContext
	if config != nil {
		m.Config = *config
	}
	if enabled != nil {
		m.Enabled = *enabled
	}
	m.UpdatedAt = time.Now()
	m.UpdatedBy = updatedBy
}

func (m *SpanMapper) ToStorable() *StorableSpanMapper {
	return &StorableSpanMapper{
		Identifiable:  types.Identifiable{ID: m.ID},
		TimeAuditable: m.TimeAuditable,
		UserAuditable: m.UserAuditable,
		GroupID:       m.GroupID,
		Name:          m.Name,
		FieldContext:  m.FieldContext,
		Config:        m.Config,
		Enabled:       m.Enabled,
	}
}

func (s *StorableSpanMapper) ToSpanMapper() *SpanMapper {
	return &SpanMapper{
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

func NewSpanMappersFromStorable(ss []*StorableSpanMapper) []*SpanMapper {
	mappers := make([]*SpanMapper, len(ss))
	for i, s := range ss {
		mappers[i] = s.ToSpanMapper()
	}
	return mappers
}

func NewGettableSpanMappers(m []*SpanMapper) *GettableSpanMappers {
	return &GettableSpanMappers{Items: m}
}
