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

	Name  string      `bun:"name,type:text,notnull"`
	Data  string      `bun:"data,type:text,notnull"`
	OrgID valuer.UUID `bun:"org_id,type:text,notnull"`
}

func (s *StorableRuleView) ToGettableRuleView() (*GettableRuleView, error) {
	data := RuleViewData{}
	if err := json.Unmarshal([]byte(s.Data), &data); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't decode rule view %s", s.ID)
	}

	return &GettableRuleView{
		ID:        s.ID,
		Name:      s.Name,
		Data:      data,
		OrgID:     s.OrgID,
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
	}, nil
}

func (s *StorableRuleView) Update(updatable UpdatableRuleView) error {
	data, err := json.Marshal(updatable.Data)
	if err != nil {
		return errors.WrapInternalf(err, errors.CodeInternal, "couldn't encode rule view %s", s.ID)
	}

	s.Name = updatable.Name
	s.Data = string(data)
	s.UpdatedAt = time.Now()
	return nil
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

func (p PostableRuleView) ToStorableRuleView(orgID valuer.UUID) (*StorableRuleView, error) {
	data, err := json.Marshal(p.Data)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't encode rule view %q", p.Name)
	}

	now := time.Now()
	return &StorableRuleView{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		Name:          p.Name,
		Data:          string(data),
		OrgID:         orgID,
	}, nil
}

type UpdatableRuleView = PostableRuleView

// NewGettableRuleViewsFromStorableRuleViews converts rows; corrupt rows come back keyed by view id for the caller to log.
func NewGettableRuleViewsFromStorableRuleViews(storables []*StorableRuleView) ([]*GettableRuleView, map[string]error) {
	views := make([]*GettableRuleView, 0, len(storables))
	errByViewID := make(map[string]error)

	for _, storable := range storables {
		view, err := storable.ToGettableRuleView()
		if err != nil {
			errByViewID[storable.ID.StringValue()] = err
			continue
		}
		views = append(views, view)
	}

	return views, errByViewID
}

type ListableRuleViews struct {
	Views []*GettableRuleView `json:"views" required:"true" nullable:"false"`
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
