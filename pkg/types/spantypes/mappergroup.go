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
	ErrCodeMappingGroupNotFound      = errors.MustNewCode("span_attribute_mapping_group_not_found")
	ErrCodeMappingGroupAlreadyExists = errors.MustNewCode("span_attribute_mapping_group_already_exists")
	ErrCodeMappingGroupNameReserved  = errors.MustNewCode("span_attribute_mapping_group_name_reserved")
	ErrCodeMappingGroupNotDeletable  = errors.MustNewCode("span_attribute_mapping_group_not_deletable")
)

// SpanMapperGroupConditionKey is one substring a span's attribute or resource
// keys are matched against.
type SpanMapperGroupConditionKey struct {
	Value   string           `json:"value" required:"true"`
	Enabled bool             `json:"enabled" required:"true"`
	Origin  SpanMapperOrigin `json:"origin"`
}

// SpanMapperGroupCondition gates whether a group's rules run for a given span.
// A group runs when any attribute or resource key on the span CONTAINS one of
// the listed substrings (plain substring match — no glob syntax).
type SpanMapperGroupCondition struct {
	Attributes []SpanMapperGroupConditionKey `json:"attributes" required:"true" nullable:"true"`
	Resource   []SpanMapperGroupConditionKey `json:"resource" required:"true" nullable:"true"`
}

// SpanMapperGroup is the domain model for a span attribute mapping group.
// Version is the shipped definition version for system groups and 0 otherwise.
type SpanMapperGroup struct {
	types.TimeAuditable
	types.UserAuditable

	ID        valuer.UUID              `json:"id" required:"true"`
	OrgID     valuer.UUID              `json:"orgId" required:"true"`
	Name      string                   `json:"name" required:"true"`
	Condition SpanMapperGroupCondition `json:"condition" required:"true"`
	Enabled   bool                     `json:"enabled" required:"true"`
	Origin    SpanMapperOrigin         `json:"origin" required:"true"`
	Version   int                      `json:"version" required:"true"`
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

// Validate requires at least one substring overall and rejects blank ones.
// All-off is allowed: a group with every substring disabled simply never runs.
func (c *SpanMapperGroupCondition) Validate() error {
	if len(c.Attributes)+len(c.Resource) == 0 {
		return errors.New(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "condition must list at least one attribute or resource substring")
	}
	for _, k := range slices.Concat(c.Attributes, c.Resource) {
		if strings.TrimSpace(k.Value) == "" {
			return errors.New(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "condition substrings must not be blank")
		}
		if !k.Origin.IsZero() && k.Origin != SpanMapperOriginUser && k.Origin != SpanMapperOriginSystem {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "condition origin must be one of %q or %q, got %q", SpanMapperOriginUser, SpanMapperOriginSystem, k.Origin.StringValue())
		}
	}
	return nil
}

func (p *PostableSpanMapperGroup) Validate() error {
	if strings.TrimSpace(p.Name) == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "group name must not be blank")
	}
	return p.Condition.Validate()
}

func NewSpanMapperGroup(orgID valuer.UUID, createdBy string, p *PostableSpanMapperGroup) *SpanMapperGroup {
	now := time.Now()
	return &SpanMapperGroup{
		ID:    valuer.GenerateUUID(),
		OrgID: orgID,
		Name:  p.Name,
		Condition: SpanMapperGroupCondition{
			Attributes: conditionKeysWithOrigin(p.Condition.Attributes, SpanMapperOriginUser),
			Resource:   conditionKeysWithOrigin(p.Condition.Resource, SpanMapperOriginUser),
		},
		Enabled: p.Enabled,
		Origin:  SpanMapperOriginUser,
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

// Update applies a user edit. A system group keeps its name and its system
// substrings; see nextConditionKeys.
func (g *SpanMapperGroup) Update(name *string, condition *SpanMapperGroupCondition, enabled *bool, updatedBy string) error {
	if name != nil {
		if g.Origin == SpanMapperOriginSystem && *name != g.Name {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "system group %q cannot be renamed", g.Name)
		}
		if strings.TrimSpace(*name) == "" {
			return errors.New(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "group name must not be blank")
		}
		g.Name = *name
	}
	if condition != nil {
		attrs, err := nextConditionKeys(g.Condition.Attributes, condition.Attributes)
		if err != nil {
			return err
		}
		res, err := nextConditionKeys(g.Condition.Resource, condition.Resource)
		if err != nil {
			return err
		}
		g.Condition = SpanMapperGroupCondition{Attributes: attrs, Resource: res}
		if err := g.Condition.Validate(); err != nil {
			return err
		}
	}
	if enabled != nil {
		g.Enabled = *enabled
	}
	g.UpdatedAt = time.Now()
	g.UpdatedBy = updatedBy
	return nil
}

func (g *SpanMapperGroup) ErrIfNotDeletable() error {
	if g.Origin == SpanMapperOriginSystem {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeMappingGroupNotDeletable, "system group %q cannot be deleted, disable it instead", g.Name)
	}
	return nil
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
		Origin:        g.Origin,
		Version:       g.Version,
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
		Origin:        s.Origin,
		Version:       s.Version,
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

// nextConditionKeys builds a substring list from an edit: user substrings are
// taken from the edit as sent, system substrings stay as stored and the edit
// can only flip their enabled flag.
func nextConditionKeys(stored, edit []SpanMapperGroupConditionKey) ([]SpanMapperGroupConditionKey, error) {
	var systemKeys, userKeys []SpanMapperGroupConditionKey
	for _, k := range stored {
		if k.Origin == SpanMapperOriginSystem {
			systemKeys = append(systemKeys, k)
		}
	}

	for _, k := range edit {
		if k.Origin != SpanMapperOriginSystem {
			k.Origin = SpanMapperOriginUser
			userKeys = append(userKeys, k)
			continue
		}
		idx := slices.IndexFunc(systemKeys, func(s SpanMapperGroupConditionKey) bool { return s.Value == k.Value })
		if idx == -1 {
			return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeMappingInvalidInput, "system substring %q does not exist on this group; only its enabled flag can change", k.Value)
		}
		systemKeys[idx].Enabled = k.Enabled
	}

	return append(systemKeys, userKeys...), nil
}

func conditionKeysWithOrigin(keys []SpanMapperGroupConditionKey, origin SpanMapperOrigin) []SpanMapperGroupConditionKey {
	out := make([]SpanMapperGroupConditionKey, len(keys))
	for i, k := range keys {
		k.Origin = origin
		out[i] = k
	}
	return out
}
