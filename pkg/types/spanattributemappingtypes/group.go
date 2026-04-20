package spanattributemappingtypes

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// as of now it can be llm, tool, agent but can extend to more things in future
type GroupCategory string

// A group runs when any of the listed attribute/resource key patterns match.
type Condition struct {
	Attributes []string `json:"attributes"`
	Resource   []string `json:"resource"`
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
		return fmt.Errorf("spanattributemappingtypes: cannot scan %T into Condition", src)
	}
	return json.Unmarshal(raw, c)
}

// SpanAttributeMappingGroup is the domain model for a span attribute mapping group.
type SpanAttributeMappingGroup struct {
	types.TimeAuditable
	types.UserAuditable

	ID        valuer.UUID   `json:"id" required:"true"`
	OrgID     valuer.UUID   `json:"ordId" required:"true"`
	Name      string        `json:"name" required:"true"`
	Category  GroupCategory `json:"category" required:"true"`
	Condition Condition     `json:"condition" required:"true"`
	Enabled   bool          `json:"enabled" required:"true"`
}

func NewSpanAttributeMappingGroupFromStorable(s *StorableSpanAttributeMappingGroup) *SpanAttributeMappingGroup {
	return &SpanAttributeMappingGroup{
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

func NewSpanAttributeMappingGroupsFromStorable(ss []*StorableSpanAttributeMappingGroup) []*SpanAttributeMappingGroup {
	groups := make([]*SpanAttributeMappingGroup, len(ss))
	for i, s := range ss {
		groups[i] = NewSpanAttributeMappingGroupFromStorable(s)
	}
	return groups
}

// GettableSpanAttributeMappingGroup is the HTTP response representation of a mapping group.
type GettableSpanAttributeMappingGroup = SpanAttributeMappingGroup

// NewGettableMappingGroup converts a domain MappingGroup to a GettableMappingGroup.
func NewGettableMappingGroup(g *SpanAttributeMappingGroup) *GettableSpanAttributeMappingGroup {
	return g
}

type PostableSpanAttributeMappingGroup struct {
	Name      string        `json:"name"      required:"true"`
	Category  GroupCategory `json:"category"  required:"true"`
	Condition Condition     `json:"condition" required:"true"`
	Enabled   bool          `json:"enabled"`
}

// UpdatableMappingGroup is the HTTP request body for updating a mapping group.
// All fields are optional; only non-nil fields are applied.
type UpdatableSpanAttributeMappingGroup struct {
	Name      *string    `json:"name,omitempty"`
	Condition *Condition `json:"condition,omitempty"`
	Enabled   *bool      `json:"enabled,omitempty"`
}

// ListMappingGroupsQuery holds optional filter parameters for listing mapping groups.
type ListSpanAttributeMappingGroupsQuery struct {
	Category *GroupCategory `query:"category"`
	Enabled  *bool          `query:"enabled"`
}

// ListMappingGroupsResponse is the response for listing mapping groups.
type ListSpanAttributeMappingGroupsResponse struct {
	Items []*GettableSpanAttributeMappingGroup `json:"items" required:"true" nullable:"true"`
}
