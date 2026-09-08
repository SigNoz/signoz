package ruletypes

import (
	"slices"
	"unicode/utf8"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	DefaultListLimit = 20
	MaxListLimit     = 5000
	MaxListQueryLen  = 1024
)

var ErrCodeRuleListInvalid = errors.MustNewCode("rule_list_invalid")

type ListSort struct{ valuer.String }

var (
	ListSortUpdatedAt = ListSort{valuer.NewString("updated_at")}
	ListSortCreatedAt = ListSort{valuer.NewString("created_at")}
	ListSortName      = ListSort{valuer.NewString("name")}
	ListSortState     = ListSort{valuer.NewString("state")}
	ListSortSeverity  = ListSort{valuer.NewString("severity")}
)

func (ListSort) Enum() []any {
	return []any{ListSortUpdatedAt, ListSortCreatedAt, ListSortName, ListSortState, ListSortSeverity}
}

func (s ListSort) IsValid() bool {
	return slices.ContainsFunc(s.Enum(), func(v any) bool { return v == s })
}

type ListOrder struct{ valuer.String }

var (
	ListOrderAsc  = ListOrder{valuer.NewString("asc")}
	ListOrderDesc = ListOrder{valuer.NewString("desc")}
)

func (ListOrder) Enum() []any {
	return []any{ListOrderAsc, ListOrderDesc}
}

func (o ListOrder) IsValid() bool {
	return slices.ContainsFunc(o.Enum(), func(v any) bool { return v == o })
}

type ListRulesParams struct {
	Query string `query:"query"`
	// Raw strings because gin's query binding cannot fill a slice of valuer
	// enums; AlertStates converts them.
	States []string `query:"states"`
	Sort   ListSort  `query:"sort"`
	Order  ListOrder `query:"order"`
	Limit  int       `query:"limit"`
	Offset int       `query:"offset"`
}

// Validate normalizes in place; an over-max limit is clamped, not rejected.
func (p *ListRulesParams) Validate() error {
	if n := utf8.RuneCountInString(p.Query); n > MaxListQueryLen {
		return errors.NewInvalidInputf(ErrCodeRuleListInvalid,
			"query cannot be longer than %d characters, got %d", MaxListQueryLen, n)
	}

	if p.Sort.IsZero() {
		p.Sort = ListSortUpdatedAt
	} else if !p.Sort.IsValid() {
		return errors.NewInvalidInputf(ErrCodeRuleListInvalid,
			"invalid sort %q, expected one of: `updated_at`, `created_at`, `name`, `state`, `severity`", p.Sort)
	}

	if p.Order.IsZero() {
		p.Order = ListOrderDesc
	} else if !p.Order.IsValid() {
		return errors.NewInvalidInputf(ErrCodeRuleListInvalid,
			"invalid order %q, expected `asc` or `desc`", p.Order)
	}

	if p.Limit == 0 {
		p.Limit = DefaultListLimit
	} else if p.Limit < 0 {
		return errors.NewInvalidInputf(ErrCodeRuleListInvalid,
			"invalid limit %d, must be a positive integer", p.Limit)
	} else if p.Limit > MaxListLimit {
		p.Limit = MaxListLimit
	}

	if p.Offset < 0 {
		return errors.NewInvalidInputf(ErrCodeRuleListInvalid,
			"invalid offset %d, must be a non-negative integer", p.Offset)
	}

	if _, err := p.AlertStates(); err != nil {
		return err
	}

	return nil
}

// AlertStates parses States; empty means no state filtering.
func (p *ListRulesParams) AlertStates() ([]AlertState, error) {
	if len(p.States) == 0 {
		return nil, nil
	}

	states := make([]AlertState, 0, len(p.States))
	for _, raw := range p.States {
		state, err := parseAlertState(raw)
		if err != nil {
			return nil, err
		}
		states = append(states, state)
	}

	return states, nil
}

func parseAlertState(raw string) (AlertState, error) {
	state := AlertState{valuer.NewString(raw)}
	if !slices.Contains(state.Enum(), any(state)) {
		return AlertState{}, errors.NewInvalidInputf(ErrCodeRuleListInvalid,
			"invalid state %q, expected one of: `firing`, `pending`, `recovering`, `inactive`, `nodata`, `disabled`", raw)
	}
	return state, nil
}
