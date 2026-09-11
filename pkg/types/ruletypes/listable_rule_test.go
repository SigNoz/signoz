package ruletypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/stretchr/testify/assert"
)

func listableRule(name string, state AlertState, severity string, updatedAt time.Time) *ListableRule {
	rule := &ListableRule{
		AlertName: name,
		State:     state,
		TimeAuditable: types.TimeAuditable{
			UpdatedAt: updatedAt,
		},
	}
	if severity != "" {
		rule.Labels = map[string]string{"severity": severity}
	}
	return rule
}

func names(rules []*ListableRule) []string {
	out := make([]string, 0, len(rules))
	for _, rule := range rules {
		out = append(out, rule.AlertName)
	}
	return out
}

func TestSortListableRules(t *testing.T) {
	base := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)

	testCases := []struct {
		name      string
		rules     []*ListableRule
		sortBy    ListSort
		order     ListOrder
		wantNames []string
	}{
		{
			name: "state desc is display priority firing first",
			rules: []*ListableRule{
				listableRule("disabled", StateDisabled, "", base),
				listableRule("nodata", StateNoData, "", base),
				listableRule("firing", StateFiring, "", base),
				listableRule("inactive", StateInactive, "", base),
				listableRule("pending", StatePending, "", base),
				listableRule("recovering", StateRecovering, "", base),
			},
			sortBy:    ListSortState,
			order:     ListOrderDesc,
			wantNames: []string{"firing", "pending", "recovering", "nodata", "inactive", "disabled"},
		},
		{
			name: "severity desc ranks known values then custom ones lexically",
			rules: []*ListableRule{
				listableRule("warn", StateInactive, "warning", base),
				listableRule("custom-b", StateInactive, "bbb", base),
				listableRule("crit", StateInactive, "critical", base),
				listableRule("custom-a", StateInactive, "aaa", base),
				listableRule("none", StateInactive, "", base),
			},
			sortBy: ListSortSeverity,
			order:  ListOrderDesc,
			// desc flips the lexical compare between custom values too
			wantNames: []string{"crit", "warn", "custom-b", "custom-a", "none"},
		},
		{
			name: "name asc is case-insensitive",
			rules: []*ListableRule{
				listableRule("banana", StateInactive, "", base),
				listableRule("Apple", StateInactive, "", base),
				listableRule("cherry", StateInactive, "", base),
			},
			sortBy:    ListSortName,
			order:     ListOrderAsc,
			wantNames: []string{"Apple", "banana", "cherry"},
		},
		{
			name: "updated_at desc puts newest first",
			rules: []*ListableRule{
				listableRule("old", StateInactive, "", base),
				listableRule("new", StateInactive, "", base.Add(time.Hour)),
			},
			sortBy:    ListSortUpdatedAt,
			order:     ListOrderDesc,
			wantNames: []string{"new", "old"},
		},
		{
			name: "state desc ties break on name asc",
			rules: []*ListableRule{
				listableRule("banana", StateFiring, "", base),
				listableRule("zebra", StateDisabled, "", base),
				listableRule("Apple", StateFiring, "", base),
				listableRule("cherry", StateFiring, "", base),
			},
			sortBy:    ListSortState,
			order:     ListOrderDesc,
			wantNames: []string{"Apple", "banana", "cherry", "zebra"},
		},
		{
			name: "state asc flips buckets but tiebreak stays name asc",
			rules: []*ListableRule{
				listableRule("banana", StateFiring, "", base),
				listableRule("zebra", StateDisabled, "", base),
				listableRule("Apple", StateFiring, "", base),
				listableRule("cherry", StateFiring, "", base),
			},
			sortBy:    ListSortState,
			order:     ListOrderAsc,
			wantNames: []string{"zebra", "Apple", "banana", "cherry"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			SortListableRules(tc.rules, tc.sortBy, tc.order)
			assert.Equal(t, tc.wantNames, names(tc.rules))
		})
	}
}

func TestSortListableRulesIdTiebreak(t *testing.T) {
	base := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)

	for _, order := range []ListOrder{ListOrderAsc, ListOrderDesc} {
		t.Run(order.StringValue(), func(t *testing.T) {
			older := listableRule("dup", StateFiring, "", base)
			older.Id = "01aaa"
			newer := listableRule("dup", StateFiring, "", base)
			newer.Id = "01bbb"

			rules := []*ListableRule{newer, older}
			SortListableRules(rules, ListSortState, order)
			assert.Equal(t, []string{"01aaa", "01bbb"}, []string{rules[0].Id, rules[1].Id})
		})
	}
}

func TestNewLabelPairsFromRawJSON(t *testing.T) {
	pairs := NewLabelPairsFromRawJSON([]string{
		`{"team":"infra","severity":"critical"}`,
		`{"team":"infra"}`,
		`{"team":"payments"}`,
		"",
		"null",
		"not-json",
	}, MaxListLabelPairs)

	assert.Equal(t, []LabelPair{
		{Key: "severity", Value: "critical"},
		{Key: "team", Value: "infra"},
		{Key: "team", Value: "payments"},
	}, pairs)
}

func TestNewLabelPairsFromRawJSONCap(t *testing.T) {
	pairs := NewLabelPairsFromRawJSON([]string{`{"a":"1","b":"2","c":"3"}`}, 2)
	assert.Len(t, pairs, 2)
}
