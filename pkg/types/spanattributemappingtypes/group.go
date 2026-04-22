package spanattributemappingtypes

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeMappingGroupNotFound      = errors.MustNewCode("span_attribute_mapping_group_not_found")
	ErrCodeMappingGroupAlreadyExists = errors.MustNewCode("span_attribute_mapping_group_already_exists")
)

// GroupCategory defaults will be llm, tool, agent but user can configure more as they want.
type GroupCategory valuer.String

// A group runs when any of the listed attribute/resource key patterns match.
type Condition struct {
	Attributes []string `json:"attributes" required:"true" nullable:"true"`
	Resource   []string `json:"resource" required:"true" nullable:"true"`
}

// Group is the domain model for a span attribute mapping group.
type Group struct {
	types.TimeAuditable
	types.UserAuditable

	ID        valuer.UUID   `json:"id" required:"true"`
	OrgID     valuer.UUID   `json:"orgId" required:"true"`
	Name      string        `json:"name" required:"true"`
	Category  GroupCategory `json:"category" required:"true"`
	Condition Condition     `json:"condition" required:"true"`
	Enabled   bool          `json:"enabled" required:"true"`
}

// GettableGroup is the HTTP response representation of a mapping group.
type GettableGroup = Group

type PostableGroup struct {
	Name      string        `json:"name"      required:"true"`
	Category  GroupCategory `json:"category"  required:"true"`
	Condition Condition     `json:"condition" required:"true"`
	Enabled   bool          `json:"enabled"`
}

// UpdatableGroup is the HTTP request body for updating a mapping group.
// All fields are optional; only non-nil fields are applied.
type UpdatableGroup struct {
	Name      *string    `json:"name,omitempty"`
	Condition *Condition `json:"condition,omitempty"`
	Enabled   *bool      `json:"enabled,omitempty"`
}

type ListGroupsQuery struct {
	Category *GroupCategory `query:"category"`
	Enabled  *bool          `query:"enabled"`
}

type GettableGroups struct {
	Items []*GettableGroup `json:"items" required:"true" nullable:"true"`
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

func NewGroupFromStorable(s *StorableGroup) *Group {
	return &Group{
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

func NewGroupFromPostable(p *PostableGroup) *Group {
	return &Group{
		Name:      p.Name,
		Category:  p.Category,
		Condition: p.Condition,
		Enabled:   p.Enabled,
	}
}

func NewGroupFromUpdatable(u *UpdatableGroup) *Group {
	g := &Group{}
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

func NewGroupsFromStorableGroups(ss []*StorableGroup) []*Group {
	groups := make([]*Group, len(ss))
	for i, s := range ss {
		groups[i] = NewGroupFromStorable(s)
	}
	return groups
}

func NewGettableGroups(g []*Group) *GettableGroups {
	return &GettableGroups{Items: g}
}
