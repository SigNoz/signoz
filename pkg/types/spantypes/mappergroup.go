package spantypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeMappingGroupNotFound      = errors.MustNewCode("span_attribute_mapping_group_not_found")
	ErrCodeMappingGroupAlreadyExists = errors.MustNewCode("span_attribute_mapping_group_already_exists")
)

// SpanMapperGroupCategory defaults will be llm, tool, agent but user can configure more as they want.
type SpanMapperGroupCategory valuer.String

// A group runs when any of the listed attribute/resource key patterns match.
type SpanMapperGroupCondition struct {
	Attributes []string `json:"attributes" required:"true" nullable:"true"`
	Resource   []string `json:"resource" required:"true" nullable:"true"`
}

// SpanMapperGroup is the domain model for a span attribute mapping group.
type SpanMapperGroup struct {
	types.TimeAuditable
	types.UserAuditable

	ID        valuer.UUID              `json:"id" required:"true"`
	OrgID     valuer.UUID              `json:"orgId" required:"true"`
	Name      string                   `json:"name" required:"true"`
	Category  SpanMapperGroupCategory  `json:"category" required:"true"`
	Condition SpanMapperGroupCondition `json:"condition" required:"true"`
	Enabled   bool                     `json:"enabled" required:"true"`
}

// GettableSpanMapperGroup is the HTTP response representation of a mapping group.
type GettableSpanMapperGroup = SpanMapperGroup

type PostableSpanMapperGroup struct {
	Name      string                   `json:"name"      required:"true"`
	Category  SpanMapperGroupCategory  `json:"category"  required:"true"`
	Condition SpanMapperGroupCondition `json:"condition" required:"true"`
	Enabled   bool                     `json:"enabled"`
}

// UpdatableSpanMapperGroup is the HTTP request body for updating a mapping group.
// All fields are optional; only non-nil fields are applied.
type UpdatableSpanMapperGroup struct {
	Name      *string                   `json:"name,omitempty"`
	Condition *SpanMapperGroupCondition `json:"condition,omitempty"`
	Enabled   *bool                     `json:"enabled,omitempty"`
}

type ListSpanMapperGroupsQuery struct {
	Category *SpanMapperGroupCategory `query:"category"`
	Enabled  *bool                    `query:"enabled"`
}

type GettableSpanMapperGroups struct {
	Items []*GettableSpanMapperGroup `json:"items" required:"true" nullable:"false"`
}

func NewSpanMapperGroupFromStorable(s *StorableSpanMapperGroup) *SpanMapperGroup {
	return &SpanMapperGroup{
		TimeAuditable: s.TimeAuditable,
		UserAuditable: s.UserAuditable,
		ID:            s.ID,
		OrgID:         s.OrgID,
		Name:          s.Name,
		Category:      s.Category,
		Condition:     s.Condition,
		Enabled:       s.Enabled,
	}
}

func NewSpanMapperGroupFromPostable(p *PostableSpanMapperGroup) *SpanMapperGroup {
	return &SpanMapperGroup{
		Name:      p.Name,
		Category:  p.Category,
		Condition: p.Condition,
		Enabled:   p.Enabled,
	}
}

func NewSpanMapperGroupFromUpdatable(u *UpdatableSpanMapperGroup) *SpanMapperGroup {
	g := &SpanMapperGroup{}
	if u.Name != nil {
		g.Name = *u.Name
	}
	if u.Condition != nil {
		g.Condition = *u.Condition
	}
	if u.Enabled != nil {
		g.Enabled = *u.Enabled
	}
	return g
}

func NewSpanMapperGroupsFromStorableGroups(ss []*StorableSpanMapperGroup) []*SpanMapperGroup {
	groups := make([]*SpanMapperGroup, len(ss))
	for i, s := range ss {
		groups[i] = NewSpanMapperGroupFromStorable(s)
	}
	return groups
}

func NewGettableSpanMapperGroups(g []*SpanMapperGroup) *GettableSpanMapperGroups {
	return &GettableSpanMapperGroups{Items: g}
}
