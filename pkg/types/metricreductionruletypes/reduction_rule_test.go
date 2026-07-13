package metricreductionruletypes_test

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/stretchr/testify/require"
)

func TestUpdatableReductionRuleValidate(t *testing.T) {
	cases := []struct {
		name    string
		req     *metricreductionruletypes.UpdatableReductionRule
		wantErr bool
	}{
		{"nil", nil, true},
		{"invalid match type", &metricreductionruletypes.UpdatableReductionRule{Labels: []string{"host"}}, true},
		{"empty labels", &metricreductionruletypes.UpdatableReductionRule{MatchType: metricreductionruletypes.MatchTypeDrop}, true},
		{"drop protected label", &metricreductionruletypes.UpdatableReductionRule{MatchType: metricreductionruletypes.MatchTypeDrop, Labels: []string{"host", "le"}}, true},
		{"keep protected label is allowed", &metricreductionruletypes.UpdatableReductionRule{MatchType: metricreductionruletypes.MatchTypeKeep, Labels: []string{"le"}}, false},
		{"valid drop", &metricreductionruletypes.UpdatableReductionRule{MatchType: metricreductionruletypes.MatchTypeDrop, Labels: []string{"host"}}, false},
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

func TestPostableReductionRuleValidate(t *testing.T) {
	valid := metricreductionruletypes.UpdatableReductionRule{MatchType: metricreductionruletypes.MatchTypeKeep, Labels: []string{"host"}}

	require.Error(t, (*metricreductionruletypes.PostableReductionRule)(nil).Validate(), "nil request")
	require.Error(t, (&metricreductionruletypes.PostableReductionRule{UpdatableReductionRule: valid}).Validate(), "metricName required")
	require.NoError(t, (&metricreductionruletypes.PostableReductionRule{MetricName: "m", UpdatableReductionRule: valid}).Validate())
}
