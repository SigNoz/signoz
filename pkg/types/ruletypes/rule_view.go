package ruletypes

import (
	"bytes"
	"encoding/json"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

const (
	RuleViewSchemaVersion = "v1"
	MaxRuleViewNameLen    = 64
)

var (
	ErrCodeRuleViewInvalidInput = errors.MustNewCode("rule_view_invalid_input")
	ErrCodeRuleViewNotFound     = errors.MustNewCode("rule_view_not_found")
)

type StorableRuleView struct {
	bun.BaseModel `bun:"table:rule_view,alias:rule_view"`

	types.Identifiable
	types.TimeAuditable

	Name  string               `bun:"name,type:text,notnull"`
	Data  storableRuleViewData `bun:"data,type:text,notnull"`
	OrgID valuer.UUID          `bun:"org_id,type:text,notnull"`
}

func (s *StorableRuleView) ToGettableRuleView() *GettableRuleView {
	return &GettableRuleView{
		ID:        s.ID,
		Name:      s.Name,
		Data:      s.Data.toRuleViewData(),
		OrgID:     s.OrgID,
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
	}
}

func (s *StorableRuleView) Update(updatable UpdatableRuleView) {
	s.Name = updatable.Name
	s.Data = newStorableRuleViewData(updatable.Data)
	s.UpdatedAt = time.Now()
}

type GettableRuleView struct {
	ID        valuer.UUID  `json:"id" required:"true"`
	Name      string       `json:"name" required:"true"`
	Data      RuleViewData `json:"data" required:"true"`
	OrgID     valuer.UUID  `json:"orgId" required:"true"`
	CreatedAt time.Time    `json:"createdAt" required:"true"`
	UpdatedAt time.Time    `json:"updatedAt" required:"true"`
}

// RuleViewData holds the rule listing state (ListRulesParams minus pagination) a view replays.
type RuleViewData struct {
	Version string `json:"version" required:"true"`
	ListFilter
}

func (d *RuleViewData) Validate() error {
	if d.Version != RuleViewSchemaVersion {
		return errors.NewInvalidInputf(ErrCodeRuleViewInvalidInput,
			"version must be %q, got %q", RuleViewSchemaVersion, d.Version)
	}
	return d.ListFilter.Validate()
}

type PostableRuleView struct {
	Name string       `json:"name" required:"true"`
	Data RuleViewData `json:"data" required:"true"`
}

func (p *PostableRuleView) UnmarshalJSON(data []byte) error {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	type alias PostableRuleView
	var tmp alias
	if err := dec.Decode(&tmp); err != nil {
		return errors.WrapInvalidInputf(err, ErrCodeRuleViewInvalidInput, "invalid saved view request body").WithAdditional(err.Error())
	}
	*p = PostableRuleView(tmp)
	return p.Validate()
}

func (p *PostableRuleView) Validate() error {
	if err := validateRuleViewName(p.Name); err != nil {
		return err
	}
	return p.Data.Validate()
}

func (p PostableRuleView) ToStorableRuleView(orgID valuer.UUID) *StorableRuleView {
	now := time.Now()
	return &StorableRuleView{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          p.Name,
		Data:          newStorableRuleViewData(p.Data),
		OrgID:         orgID,
	}
}

type UpdatableRuleView = PostableRuleView

func NewGettableRuleViewsFromStorableRuleViews(storables []*StorableRuleView) []*GettableRuleView {
	views := make([]*GettableRuleView, 0, len(storables))
	for _, storable := range storables {
		views = append(views, storable.ToGettableRuleView())
	}
	return views
}

type ListableRuleViews struct {
	Views []*GettableRuleView `json:"views" required:"true" nullable:"false"`
}

// storableRuleViewData owns the persisted blob format; wire tag changes must not affect stored rows.
type storableRuleViewData struct {
	Version string   `json:"version"`
	Query   string   `json:"query"`
	States  []string `json:"states"`
	Sort    string   `json:"sort"`
	Order   string   `json:"order"`
}

func newStorableRuleViewData(data RuleViewData) storableRuleViewData {
	return storableRuleViewData{
		Version: data.Version,
		Query:   data.Query,
		States:  data.States,
		Sort:    data.Sort.StringValue(),
		Order:   data.Order.StringValue(),
	}
}

func (d storableRuleViewData) toRuleViewData() RuleViewData {
	return RuleViewData{
		Version: d.Version,
		ListFilter: ListFilter{
			Query:  d.Query,
			States: d.States,
			Sort:   ListSort{valuer.NewString(d.Sort)},
			Order:  ListOrder{valuer.NewString(d.Order)},
		},
	}
}

func validateRuleViewName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errors.NewInvalidInputf(ErrCodeRuleViewInvalidInput, "name is required")
	}
	if name != strings.TrimSpace(name) {
		return errors.NewInvalidInputf(ErrCodeRuleViewInvalidInput, "name must not have leading or trailing whitespace")
	}
	if n := utf8.RuneCountInString(name); n > MaxRuleViewNameLen {
		return errors.NewInvalidInputf(ErrCodeRuleViewInvalidInput,
			"name must be at most %d characters, got %d", MaxRuleViewNameLen, n)
	}
	return nil
}
