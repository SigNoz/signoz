package rules

import (
	"testing"
	"time"

	pql "github.com/prometheus/prometheus/promql"
	"github.com/stretchr/testify/assert"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

func TestPromRuleShouldAlert(t *testing.T) {
	postableRule := PostableRule{
		AlertName:  "Test Rule",
		AlertType:  AlertTypeMetric,
		RuleType:   RuleTypeProm,
		EvalWindow: Duration(5 * time.Minute),
		Frequency:  Duration(1 * time.Minute),
		RuleCondition: &RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query: "dummy_query", // This is not used in the test
					},
				},
			},
		},
	}

	cases := []struct {
		values              pql.Series
		expectAlert         bool
		compareOp           string
		matchType           string
		target              float64
		expectedAlertSample v3.Point
	}{
		// Test cases for Equals Always
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "2", // Always
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 1.0},
					{F: 0.0},
					{F: 1.0},
					{F: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		// Test cases for Equals Once
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 1.0},
					{F: 0.0},
					{F: 1.0},
					{F: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		// Test cases for Greater Than Always
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "2", // Always
			target:              1.5,
			expectedAlertSample: v3.Point{Value: 2.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 11.0},
					{F: 4.0},
					{F: 3.0},
					{F: 7.0},
					{F: 12.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Above
			matchType:           "2", // Always
			target:              2.0,
			expectedAlertSample: v3.Point{Value: 3.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 11.0},
					{F: 4.0},
					{F: 3.0},
					{F: 7.0},
					{F: 12.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Below
			matchType:           "2", // Always
			target:              13.0,
			expectedAlertSample: v3.Point{Value: 12.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "2", // Always
			target:      4.5,
		},
		// Test cases for Greater Than Once
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "1", // Once
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 4.0},
					{F: 4.0},
					{F: 4.0},
					{F: 4.0},
					{F: 4.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "1", // Once
			target:      4.5,
		},
		// Test cases for Not Equals Always
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 1.0},
					{F: 0.0},
					{F: 1.0},
					{F: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "2", // Always
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 1.0},
					{F: 0.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		// Test cases for Not Equals Once
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 1.0},
					{F: 0.0},
					{F: 1.0},
					{F: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
					{F: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 0.0},
					{F: 0.0},
					{F: 1.0},
					{F: 0.0},
					{F: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
					{F: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		// Test cases for Less Than Always
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 1.5},
					{F: 1.5},
					{F: 1.5},
					{F: 1.5},
					{F: 1.5},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "2", // Always
			target:              4,
			expectedAlertSample: v3.Point{Value: 1.5},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 4.5},
					{F: 4.5},
					{F: 4.5},
					{F: 4.5},
					{F: 4.5},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "2", // Always
			target:      4,
		},
		// Test cases for Less Than Once
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 4.5},
					{F: 4.5},
					{F: 4.5},
					{F: 4.5},
					{F: 2.5},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "1", // Once
			target:              4,
			expectedAlertSample: v3.Point{Value: 2.5},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 4.5},
					{F: 4.5},
					{F: 4.5},
					{F: 4.5},
					{F: 4.5},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "1", // Once
			target:      4,
		},
		// Test cases for OnAverage
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "3", // OnAverage
			target:              6.0,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "3", // OnAverage
			target:      4.5,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "3", // OnAverage
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "3", // OnAverage
			target:      6.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "3", // OnAverage
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "3", // OnAverage
			target:              12.0,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		// Test cases for InTotal
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "4", // InTotal
			target:              30.0,
			expectedAlertSample: v3.Point{Value: 30.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 4.0},
					{F: 6.0},
					{F: 8.0},
					{F: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "4", // InTotal
			target:      20.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "4", // InTotal
			target:              9.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "4", // InTotal
			target:      10.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "4", // InTotal
			target:              10.0,
			expectedAlertSample: v3.Point{Value: 20.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "4", // InTotal
			target:      20.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "4", // InTotal
			target:              30.0,
			expectedAlertSample: v3.Point{Value: 20.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "4", // InTotal
			target:      20.0,
		},
	}

	for idx, c := range cases {
		postableRule.RuleCondition.CompareOp = CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target

		rule, err := NewPromRule("69", &postableRule, zap.NewNop(), nil, nil)
		if err != nil {
			assert.NoError(t, err)
		}

		_, shoulAlert := rule.ShouldAlert(toCommonSeries(c.values))
		assert.Equal(t, c.expectAlert, shoulAlert, "Test case %d", idx)
	}
}
