package aio11ymappingtypes

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type GroupCategory string

const (
	GroupCategoryLLM   GroupCategory = "llm"
	GroupCategoryTool  GroupCategory = "tool"
	GroupCategoryAgent GroupCategory = "agent"
)

func (GroupCategory) Enum() []any {
	return []any{GroupCategoryLLM, GroupCategoryTool, GroupCategoryAgent}
}

// Condition is the trigger condition for a mapping group.
// A group runs when any of the listed attribute/resource key patterns match.
// It implements driver.Valuer and sql.Scanner for JSON text column storage.
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
		return fmt.Errorf("aio11ymappingtypes: cannot scan %T into Condition", src)
	}
	return json.Unmarshal(raw, c)
}

// MappingGroup is the domain model for a span attribute mapping group.
// It has no serialisation concerns — use GettableMappingGroup for HTTP responses.
type MappingGroup struct {
	types.TimeAuditable
	types.UserAuditable

	ID        string
	OrgID     valuer.UUID
	Name      string
	Category  GroupCategory
	Condition Condition
	Enabled   bool
}

// NewMappingGroupFromStorable converts a StorableMappingGroup to a MappingGroup.
func NewMappingGroupFromStorable(s *StorableMappingGroup) *MappingGroup {
	return &MappingGroup{
		TimeAuditable: s.TimeAuditable,
		UserAuditable: s.UserAuditable,
		ID:            s.ID.StringValue(),
		OrgID:         s.OrgID,
		Name:          s.Name,
		Category:      s.Category,
		Condition:     s.Condition,
		Enabled:       s.Enabled,
	}
}

// NewMappingGroupsFromStorable converts a slice of StorableMappingGroup to a slice of MappingGroup.
func NewMappingGroupsFromStorable(ss []*StorableMappingGroup) []*MappingGroup {
	groups := make([]*MappingGroup, len(ss))
	for i, s := range ss {
		groups[i] = NewMappingGroupFromStorable(s)
	}
	return groups
}

// GettableMappingGroup is the HTTP response representation of a mapping group.
type GettableMappingGroup struct {
	ID        string        `json:"id"         required:"true"`
	Name      string        `json:"name"       required:"true"`
	Category  GroupCategory `json:"category"   required:"true"`
	Condition Condition     `json:"condition"  required:"true"`
	Enabled   bool          `json:"enabled"    required:"true"`
	CreatedAt time.Time     `json:"created_at" required:"true"`
	UpdatedAt time.Time     `json:"updated_at" required:"true"`
	CreatedBy string        `json:"created_by" required:"true"`
	UpdatedBy string        `json:"updated_by" required:"true"`
}

// NewGettableMappingGroup converts a domain MappingGroup to a GettableMappingGroup.
func NewGettableMappingGroup(g *MappingGroup) *GettableMappingGroup {
	return &GettableMappingGroup{
		ID:        g.ID,
		Name:      g.Name,
		Category:  g.Category,
		Condition: g.Condition,
		Enabled:   g.Enabled,
		CreatedAt: g.CreatedAt,
		UpdatedAt: g.UpdatedAt,
		CreatedBy: g.CreatedBy,
		UpdatedBy: g.UpdatedBy,
	}
}

// PostableMappingGroup is the HTTP request body for creating a mapping group.
type PostableMappingGroup struct {
	Name      string        `json:"name"      required:"true"`
	Category  GroupCategory `json:"category"  required:"true"`
	Condition Condition     `json:"condition" required:"true"`
	Enabled   bool          `json:"enabled"`
}

// UpdatableMappingGroup is the HTTP request body for updating a mapping group.
// All fields are optional; only non-nil fields are applied.
type UpdatableMappingGroup struct {
	Name      *string    `json:"name,omitempty"`
	Condition *Condition `json:"condition,omitempty"`
	Enabled   *bool      `json:"enabled,omitempty"`
}

// ListMappingGroupsQuery holds optional filter parameters for listing mapping groups.
type ListMappingGroupsQuery struct {
	Category *GroupCategory `query:"category"`
	Enabled  *bool          `query:"enabled"`
}

// ListMappingGroupsResponse is the response for listing mapping groups.
type ListMappingGroupsResponse struct {
	Items []*GettableMappingGroup `json:"items" required:"true" nullable:"true"`
}
