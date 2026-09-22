package ruletypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func TestToListableRule(t *testing.T) {
	created := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	updated := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)

	storable := &StorableRule{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: created, UpdatedAt: updated},
		UserAuditable: types.UserAuditable{CreatedBy: "creator@signoz.io", UpdatedBy: "updater@signoz.io"},
		Data:          `{"alert":"High CPU","description":"cpu is hot","alertType":"METRIC_BASED_ALERT","ruleType":"threshold_rule","disabled":true,"labels":{"severity":"critical"}}`,
	}

	listable, err := storable.ToListableRule()
	require.NoError(t, err)

	assert.Equal(t, storable.ID.StringValue(), listable.Id)
	assert.Equal(t, "High CPU", listable.AlertName)
	assert.Equal(t, "cpu is hot", listable.Description)
	assert.Equal(t, AlertTypeMetric, listable.AlertType)
	assert.Equal(t, RuleTypeThreshold, listable.RuleType)
	assert.True(t, listable.Disabled)
	assert.Equal(t, map[string]string{"severity": "critical"}, listable.Labels)
	assert.Equal(t, created, listable.CreatedAt)
	assert.Equal(t, "creator@signoz.io", listable.CreatedBy)
	assert.Equal(t, updated, listable.UpdatedAt)
	assert.Equal(t, "updater@signoz.io", listable.UpdatedBy)
	assert.True(t, listable.State.IsZero())

	_, err = (&StorableRule{Data: "not json"}).ToListableRule()
	assert.Error(t, err)
}

func TestNewListableRulesFromStorableRules(t *testing.T) {
	enabledID := valuer.GenerateUUID()
	pausedID := valuer.GenerateUUID()
	corruptID := valuer.GenerateUUID()

	storedRules := []*StorableRule{
		{
			Identifiable: types.Identifiable{ID: enabledID},
			Data:         `{"alert":"cpu high","alertType":"METRIC_BASED_ALERT","ruleType":"threshold_rule"}`,
		},
		{
			Identifiable: types.Identifiable{ID: pausedID},
			Data:         `{"alert":"mem high","alertType":"METRIC_BASED_ALERT","ruleType":"threshold_rule","disabled":true}`,
		},
		{
			Identifiable: types.Identifiable{ID: corruptID},
			Data:         "not json",
		},
	}
	stateByRuleID := map[string]AlertState{enabledID.StringValue(): StateFiring}

	testCases := []struct {
		name        string
		stateFilter map[AlertState]struct{}
		wantNames   []string
		wantStates  map[string]AlertState
	}{
		{
			name:       "NoFilter_KeepsAllParseableRows",
			wantNames:  []string{"cpu high", "mem high"},
			wantStates: map[string]AlertState{"cpu high": StateFiring, "mem high": StateDisabled},
		},
		{
			name:        "FiringFilter_KeepsOverlaidState",
			stateFilter: map[AlertState]struct{}{StateFiring: {}},
			wantNames:   []string{"cpu high"},
			wantStates:  map[string]AlertState{"cpu high": StateFiring},
		},
		{
			name:        "DisabledFilter_KeepsAbsentFromSnapshot",
			stateFilter: map[AlertState]struct{}{StateDisabled: {}},
			wantNames:   []string{"mem high"},
			wantStates:  map[string]AlertState{"mem high": StateDisabled},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			listableRules, errByRuleID := NewListableRulesFromStorableRules(storedRules, stateByRuleID, testCase.stateFilter)

			require.Len(t, errByRuleID, 1)
			assert.Error(t, errByRuleID[corruptID.StringValue()])

			assert.Equal(t, testCase.wantNames, names(listableRules))
			for _, rule := range listableRules {
				assert.Equal(t, testCase.wantStates[rule.AlertName], rule.State)
			}
		})
	}

	disabledRow, _ := NewListableRulesFromStorableRules(storedRules[1:2], stateByRuleID, nil)
	require.Len(t, disabledRow, 1)
	assert.True(t, disabledRow[0].Disabled)
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
