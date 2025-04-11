package rules

import (
	"testing"

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
			_, shouldAlert := test.rule.ShouldAlert(*test.series)
			if shouldAlert != test.shouldAlert {
				t.Errorf("expected shouldAlert to be %v, got %v", test.shouldAlert, shouldAlert)
			}
		})
	}
}
