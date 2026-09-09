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

type RuleView struct {
	bun.BaseModel `bun:"table:rule_view,alias:rule_view"`

	types.Identifiable
	types.TimeAuditable

	Name  string       `bun:"name,type:text,notnull" json:"name" required:"true"`
	Data  RuleViewData `bun:"data,type:text,notnull" json:"data" required:"true"`
	OrgID valuer.UUID  `bun:"org_id,type:text,notnull" json:"orgId" required:"true"`
}

// RuleViewData holds the rule listing state (ListRulesParams minus pagination) a view replays.
type RuleViewData struct {
	Version string    `json:"version" required:"true"`
	Query   string    `json:"query"`
	States  []string  `json:"states"`
	Sort    ListSort  `json:"sort"`
	Order   ListOrder `json:"order"`
}

// Validate normalizes in place; zero sort/order get the list defaults.
func (d *RuleViewData) Validate() error {
	if d.Version != RuleViewSchemaVersion {
		return errors.NewInvalidInputf(ErrCodeRuleViewInvalidInput,
			"version must be %q, got %q", RuleViewSchemaVersion, d.Version)
	}

	if n := utf8.RuneCountInString(d.Query); n > MaxListQueryLen {
		return errors.NewInvalidInputf(ErrCodeRuleViewInvalidInput,
			"query cannot be longer than %d characters, got %d", MaxListQueryLen, n)
	}

	for _, raw := range d.States {
		if _, err := parseAlertState(raw); err != nil {
			return errors.WrapInvalidInputf(err, ErrCodeRuleViewInvalidInput, "invalid states")
		}
	}

	if d.Sort.IsZero() {
		d.Sort = ListSortUpdatedAt
	} else if !d.Sort.IsValid() {
		return errors.NewInvalidInputf(ErrCodeRuleViewInvalidInput,
			"invalid sort %q, expected one of: `updated_at`, `created_at`, `name`, `state`, `severity`", d.Sort)
	}

	if d.Order.IsZero() {
		d.Order = ListOrderDesc
	} else if !d.Order.IsValid() {
		return errors.NewInvalidInputf(ErrCodeRuleViewInvalidInput,
			"invalid order %q, expected `asc` or `desc`", d.Order)
	}

	return nil
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

func (p PostableRuleView) NewRuleView(orgID valuer.UUID) *RuleView {
	now := time.Now()
	return &RuleView{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: now, UpdatedAt: now},
		OrgID:         orgID,
		Name:          p.Name,
		Data:          p.Data,
	}
}

type UpdatableRuleView = PostableRuleView

func (v *RuleView) Update(updateable UpdatableRuleView) {
	v.Name = updateable.Name
	v.Data = updateable.Data
	v.UpdatedAt = time.Now()
}

type ListableRuleViews struct {
	Views []*RuleView `json:"views" required:"true" nullable:"false"`
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
