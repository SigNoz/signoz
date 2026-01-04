package rules

import (
	"testing"

	"github.com/stretchr/testify/require"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
)

func TestBaseRule_RequireMinPoints(t *testing.T) {
	threshold := 1.0
	tests := []struct {
		name        string
		rule        *BaseRule
		shouldAlert bool
		series      *v3.Series
	}{
		{
			name: "test should skip if less than min points",
			rule: &BaseRule{
				ruleCondition: &ruletypes.RuleCondition{
					RequireMinPoints:  true,
					RequiredNumPoints: 4,
				},

				Threshold: ruletypes.BasicRuleThresholds{
					{
						Name:        "test-threshold",
						TargetValue: &threshold,
						CompareOp:   ruletypes.ValueIsAbove,
						MatchType:   ruletypes.AtleastOnce,
					},
				},
			},
			series: &v3.Series{
				Points: []v3.Point{
					{Value: 1},
					{Value: 2},
				},
			},
			shouldAlert: false,
		},
		{
			name: "test should alert if more than min points",
			rule: &BaseRule{
				ruleCondition: &ruletypes.RuleCondition{
					RequireMinPoints:  true,
					RequiredNumPoints: 4,
					CompareOp:         ruletypes.ValueIsAbove,
					MatchType:         ruletypes.AtleastOnce,
					Target:            &threshold,
				},
				Threshold: ruletypes.BasicRuleThresholds{
					{
						Name:        "test-threshold",
						TargetValue: &threshold,
						CompareOp:   ruletypes.ValueIsAbove,
						MatchType:   ruletypes.AtleastOnce,
					},
				},
			},
			series: &v3.Series{
				Points: []v3.Point{
					{Value: 1},
					{Value: 2},
					{Value: 3},
					{Value: 4},
				},
			},
			shouldAlert: true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := test.rule.Threshold.Eval(*test.series, "", ruletypes.EvalData{})
			require.NoError(t, err)
			require.Equal(t, len(test.series.Points) >= test.rule.ruleCondition.RequiredNumPoints, test.shouldAlert)
		})
	}
}
