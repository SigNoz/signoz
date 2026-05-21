package spantypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeMappingGroupNotFound      = errors.MustNewCode("span_attribute_mapping_group_not_found")
	ErrCodeMappingGroupAlreadyExists = errors.MustNewCode("span_attribute_mapping_group_already_exists")
)

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
	Condition SpanMapperGroupCondition `json:"condition" required:"true"`
	Enabled   bool                     `json:"enabled" required:"true"`
}

// GettableSpanMapperGroup is the HTTP response representation of a mapping group.
type GettableSpanMapperGroup = SpanMapperGroup

type PostableSpanMapperGroup struct {
	Name      string                   `json:"name"      required:"true"`
	Condition SpanMapperGroupCondition `json:"condition" required:"true"`
	Enabled   bool                     `json:"enabled"`
}

// UpdatableSpanMapperGroup is the HTTP request body for updating a mapping group.
// All fields are optional; only non-nil fields are applied.
type UpdatableSpanMapperGroup struct {
	Name      *string                   `json:"name" nullable:"true"`
	Condition *SpanMapperGroupCondition `json:"condition" nullable:"true"`
	Enabled   *bool                     `json:"enabled" nullable:"true"`
}

type ListSpanMapperGroupsQuery struct {
	Enabled *bool `query:"enabled"`
}

type GettableSpanMapperGroups struct {
	Items []*GettableSpanMapperGroup `json:"items" required:"true" nullable:"false"`
}

func NewSpanMapperGroup(orgID valuer.UUID, createdBy string, p *PostableSpanMapperGroup) *SpanMapperGroup {
	now := time.Now()
	return &SpanMapperGroup{
		ID:        valuer.GenerateUUID(),
		OrgID:     orgID,
		Name:      p.Name,
		Condition: p.Condition,
		Enabled:   p.Enabled,
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

func (g *SpanMapperGroup) Update(name *string, condition *SpanMapperGroupCondition, enabled *bool, updatedBy string) {
	if name != nil {
		g.Name = *name
	}
	if condition != nil {
		g.Condition = *condition
	}
	if enabled != nil {
		g.Enabled = *enabled
	}
	g.UpdatedAt = time.Now()
	g.UpdatedBy = updatedBy
}

func (g *SpanMapperGroup) ToStorable() *StorableSpanMapperGroup {
	return &StorableSpanMapperGroup{
		Identifiable:  types.Identifiable{ID: g.ID},
		TimeAuditable: g.TimeAuditable,
		UserAuditable: g.UserAuditable,
		OrgID:         g.OrgID,
		Name:          g.Name,
		Condition:     g.Condition,
		Enabled:       g.Enabled,
	}
}

func (s *StorableSpanMapperGroup) ToSpanMapperGroup() *SpanMapperGroup {
	return &SpanMapperGroup{
		TimeAuditable: s.TimeAuditable,
		UserAuditable: s.UserAuditable,
		ID:            s.ID,
		OrgID:         s.OrgID,
		Name:          s.Name,
		Condition:     s.Condition,
		Enabled:       s.Enabled,
	}
}

func NewSpanMapperGroupsFromStorable(ss []*StorableSpanMapperGroup) []*SpanMapperGroup {
	groups := make([]*SpanMapperGroup, len(ss))
	for i, s := range ss {
		groups[i] = s.ToSpanMapperGroup()
	}
	return groups
}

func NewGettableSpanMapperGroups(g []*SpanMapperGroup) *GettableSpanMapperGroups {
	return &GettableSpanMapperGroups{Items: g}
}
