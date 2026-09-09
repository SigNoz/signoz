package spantypes

import (
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeMapperNotFound      = errors.MustNewCode("span_attribute_mapper_not_found")
	ErrCodeMapperAlreadyExists = errors.MustNewCode("span_attribute_mapper_already_exists")
	ErrCodeMapperNotDeletable  = errors.MustNewCode("span_attribute_mapper_not_deletable")
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

// SpanMapperOrigin tells shipped (system) items apart from user-created ones.
// System items are read-only apart from their enabled toggle.
type SpanMapperOrigin struct {
	valuer.String
}

var (
	SpanMapperOriginUser   = SpanMapperOrigin{valuer.NewString("user")}
	SpanMapperOriginSystem = SpanMapperOrigin{valuer.NewString("system")}
)

// MapperSource describes one candidate source for a target attribute.
type SpanMapperSource struct {
	Key       string              `json:"key" required:"true"`
	Context   FieldContext        `json:"context" required:"true"`
	Operation SpanMapperOperation `json:"operation" required:"true"`
	Priority  int                 `json:"priority" required:"true"`
	Enabled   bool                `json:"enabled" required:"true"`
	Origin    SpanMapperOrigin    `json:"origin"`
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
	GroupID      valuer.UUID      `json:"groupId"       required:"true"`
	Name         string           `json:"name"          required:"true"`
	FieldContext FieldContext     `json:"fieldContext"  required:"true"`
	Config       SpanMapperConfig `json:"config"        required:"true"`
	Enabled      bool             `json:"enabled"       required:"true"`
	Origin       SpanMapperOrigin `json:"origin"        required:"true"`
}

type PostableSpanMapper struct {
	Name         string           `json:"name"          required:"true"`
	FieldContext FieldContext     `json:"fieldContext"  required:"true"`
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

func (SpanMapperOrigin) Enum() []any {
	return []any{SpanMapperOriginUser, SpanMapperOriginSystem}
}

// Matches reports whether two sources read the same attribute the same way;
// priority and toggles are not part of the identity.
func (s SpanMapperSource) Matches(other SpanMapperSource) bool {
	return s.Key == other.Key && s.Context == other.Context && s.Operation == other.Operation
}

func (p *PostableSpanMapper) Validate() error {
	if strings.TrimSpace(p.Name) == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "mapper name must not be blank")
	}
	if err := p.FieldContext.Validate(); err != nil {
		return err
	}
	return p.Config.Validate()
}

func (f FieldContext) Validate() error {
	if f != FieldContextSpanAttribute && f != FieldContextResource {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "field context must be one of %q or %q, got %q", FieldContextSpanAttribute, FieldContextResource, f.StringValue())
	}
	return nil
}

// Validate checks every source and rejects duplicate priorities within an
// origin. Shipped and user sources are never compared with each other: a user
// re-adding a shipped key with another operation is the supported override.
func (c *SpanMapperConfig) Validate() error {
	if len(c.Sources) == 0 {
		return errors.New(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "config.sources must contain at least one source")
	}
	seen := map[SpanMapperOrigin]map[int]struct{}{}
	for _, s := range c.Sources {
		if strings.TrimSpace(s.Key) == "" {
			return errors.New(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "source key must not be blank")
		}
		if err := s.Context.Validate(); err != nil {
			return err
		}
		if s.Operation != SpanMapperOperationCopy && s.Operation != SpanMapperOperationMove {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "source operation must be one of %q or %q, got %q", SpanMapperOperationCopy, SpanMapperOperationMove, s.Operation.StringValue())
		}
		if !s.Origin.IsZero() && s.Origin != SpanMapperOriginUser && s.Origin != SpanMapperOriginSystem {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "source origin must be one of %q or %q, got %q", SpanMapperOriginUser, SpanMapperOriginSystem, s.Origin.StringValue())
		}
		origin := s.Origin
		if origin.IsZero() {
			origin = SpanMapperOriginUser
		}
		if seen[origin] == nil {
			seen[origin] = map[int]struct{}{}
		}
		if _, dup := seen[origin][s.Priority]; dup {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "source priority %d is used more than once", s.Priority)
		}
		seen[origin][s.Priority] = struct{}{}
	}
	return nil
}

func NewSpanMapper(groupID valuer.UUID, createdBy string, p *PostableSpanMapper) *SpanMapper {
	now := time.Now()
	return &SpanMapper{
		ID:           valuer.GenerateUUID(),
		GroupID:      groupID,
		Name:         p.Name,
		FieldContext: p.FieldContext,
		Config:       SpanMapperConfig{Sources: withOrigin(p.Config.Sources, SpanMapperOriginUser)},
		Enabled:      p.Enabled,
		Origin:       SpanMapperOriginUser,
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

// Update applies a user edit; a zero fieldContext means it was omitted. On a
// system mapper the field context is fixed and the stored system sources are
// kept; see nextSources.
func (m *SpanMapper) Update(fieldContext FieldContext, config *SpanMapperConfig, enabled *bool, updatedBy string) error {
	if !fieldContext.IsZero() {
		if m.Origin == SpanMapperOriginSystem && fieldContext != m.FieldContext {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "field context of system mapper %q cannot be changed", m.Name)
		}
		if err := fieldContext.Validate(); err != nil {
			return err
		}
		m.FieldContext = fieldContext
	}
	if config != nil {
		sources, err := m.nextSources(config.Sources)
		if err != nil {
			return err
		}
		m.Config = SpanMapperConfig{Sources: sources}
		if err := m.Config.Validate(); err != nil {
			return err
		}
	}
	if enabled != nil {
		m.Enabled = *enabled
	}
	m.UpdatedAt = time.Now()
	m.UpdatedBy = updatedBy
	return nil
}

func (m *SpanMapper) ErrIfNotDeletable() error {
	if m.Origin == SpanMapperOriginSystem {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeMapperNotDeletable, "system mapper %q cannot be deleted, disable it instead", m.Name)
	}
	return nil
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
		Origin:        m.Origin,
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
		Origin:        s.Origin,
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

// nextSources builds the source list from an edit: user sources are taken from
// the edit as sent, system sources stay as stored and the edit can only flip
// their enabled flag.
func (m *SpanMapper) nextSources(edit []SpanMapperSource) ([]SpanMapperSource, error) {
	var systemSources, userSources []SpanMapperSource
	for _, s := range m.Config.Sources {
		if s.Origin == SpanMapperOriginSystem {
			systemSources = append(systemSources, s)
		}
	}

	for _, s := range edit {
		if s.Origin != SpanMapperOriginSystem {
			s.Origin = SpanMapperOriginUser
			userSources = append(userSources, s)
			continue
		}
		idx := slices.IndexFunc(systemSources, s.Matches)
		if idx == -1 {
			return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "system source %q does not exist on this mapper; only its enabled flag can change", s.Key)
		}
		systemSources[idx].Enabled = s.Enabled
	}

	return append(systemSources, userSources...), nil
}

func withOrigin(sources []SpanMapperSource, origin SpanMapperOrigin) []SpanMapperSource {
	out := make([]SpanMapperSource, len(sources))
	for i, s := range sources {
		s.Origin = origin
		out[i] = s
	}
	return out
}

func enabledSystemSources(sources []SpanMapperSource) []SpanMapperSource {
	out := withOrigin(sources, SpanMapperOriginSystem)
	for i := range out {
		out[i].Enabled = true
	}
	return out
}
