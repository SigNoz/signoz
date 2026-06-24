package metricreductionruletypes_test

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestListReductionRulesParamsSortDefaults(t *testing.T) {
	var params metricreductionruletypes.ListReductionRulesParams
	require.NoError(t, binding.Query.BindQuery(map[string][]string{"limit": {"10"}}, &params))

	assert.Equal(t, metricreductionruletypes.OrderByReduction, params.OrderBy, "orderBy defaults to reduction")
	assert.Equal(t, metricreductionruletypes.OrderDesc, params.Order, "order defaults to desc")
}

func TestListReductionRulesParamsValidate(t *testing.T) {
	require.Error(t, (&metricreductionruletypes.ListReductionRulesParams{Limit: 0}).Validate(), "limit must be set")
	require.Error(t, (&metricreductionruletypes.ListReductionRulesParams{Limit: 10, Offset: -1}).Validate(), "offset must not be negative")
	require.NoError(t, (&metricreductionruletypes.ListReductionRulesParams{Limit: 10}).Validate())
}

func TestPostableReductionRuleValidate(t *testing.T) {
	cases := []struct {
		name    string
		req     *metricreductionruletypes.PostableReductionRule
		wantErr bool
	}{
		{"nil", nil, true},
		{"empty metric name", &metricreductionruletypes.PostableReductionRule{MatchType: metricreductionruletypes.MatchTypeDrop, Labels: []string{"host"}}, true},
		{"invalid match type", &metricreductionruletypes.PostableReductionRule{MetricName: "m", Labels: []string{"host"}}, true},
		{"empty labels", &metricreductionruletypes.PostableReductionRule{MetricName: "m", MatchType: metricreductionruletypes.MatchTypeDrop}, true},
		{"drop protected label", &metricreductionruletypes.PostableReductionRule{MetricName: "m", MatchType: metricreductionruletypes.MatchTypeDrop, Labels: []string{"host", "le"}}, true},
		{"keep protected label is allowed", &metricreductionruletypes.PostableReductionRule{MetricName: "m", MatchType: metricreductionruletypes.MatchTypeKeep, Labels: []string{"le"}}, false},
		{"valid drop", &metricreductionruletypes.PostableReductionRule{MetricName: "m", MatchType: metricreductionruletypes.MatchTypeDrop, Labels: []string{"host"}}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if tc.wantErr {
				require.Error(t, tc.req.Validate())
				return
			}
			require.NoError(t, tc.req.Validate())
		})
	}
}
