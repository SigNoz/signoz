package rules

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	pql "github.com/prometheus/prometheus/promql"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func getVectorValues(vectors []ruletypes.Sample) []float64 {
	if len(vectors) == 0 {
		return []float64{} // Return empty slice instead of nil
	}
	var values []float64
	for _, v := range vectors {
		values = append(values, v.V)
	}
	return values
}

func TestPromRuleEval(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Test Rule",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Query: "dummy_query", // This is not used in the test
						},
					},
				},
			},
		},
	}

	cases := []struct {
		values               pql.Series
		expectAlert          bool
		compareOperator      ruletypes.CompareOperator
		matchType            ruletypes.MatchType
		target               float64
		expectedAlertSample  qbtypes.TimeSeriesValue
		expectedVectorValues []float64 // Expected values in result vector
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
			expectAlert:          true,
			compareOperator:      ruletypes.ValueIsEq,
			matchType:            ruletypes.AllTheTimes,
			target:               0.0,
			expectedAlertSample:  qbtypes.TimeSeriesValue{Value: 0.0},
			expectedVectorValues: []float64{0.0},
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
			expectAlert:          false,
			compareOperator:      ruletypes.ValueIsEq,
			matchType:            ruletypes.AllTheTimes,
			target:               0.0,
			expectedVectorValues: []float64{},
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
			expectAlert:          false,
			compareOperator:      ruletypes.ValueIsEq,
			matchType:            ruletypes.AllTheTimes,
			target:               0.0,
			expectedVectorValues: []float64{},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsEq,
			matchType:       ruletypes.AllTheTimes,
			target:          0.0,
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
			expectAlert:          true,
			compareOperator:      ruletypes.ValueIsEq,
			matchType:            ruletypes.AtleastOnce,
			target:               0.0,
			expectedAlertSample:  qbtypes.TimeSeriesValue{Value: 0.0},
			expectedVectorValues: []float64{0.0},
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
			compareOperator:     ruletypes.ValueIsEq,
			matchType:           ruletypes.AtleastOnce,
			target:              0.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 0.0},
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
			compareOperator:     ruletypes.ValueIsEq,
			matchType:           ruletypes.AtleastOnce,
			target:              0.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 0.0},
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
			expectAlert:          false,
			compareOperator:      ruletypes.ValueIsEq,
			matchType:            ruletypes.AtleastOnce,
			target:               0.0,
			expectedVectorValues: []float64{},
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
			expectAlert:          true,
			compareOperator:      ruletypes.ValueIsAbove,
			matchType:            ruletypes.AllTheTimes,
			target:               1.5,
			expectedAlertSample:  qbtypes.TimeSeriesValue{Value: 2.0},
			expectedVectorValues: []float64{2.0},
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
			compareOperator:     ruletypes.ValueIsAbove,
			matchType:           ruletypes.AllTheTimes,
			target:              2.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 3.0},
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
			compareOperator:     ruletypes.ValueIsBelow,
			matchType:           ruletypes.AllTheTimes,
			target:              13.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 12.0},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AllTheTimes,
			target:          4.5,
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
			expectAlert:          true,
			compareOperator:      ruletypes.ValueIsAbove,
			matchType:            ruletypes.AtleastOnce,
			target:               4.5,
			expectedAlertSample:  qbtypes.TimeSeriesValue{Value: 10.0},
			expectedVectorValues: []float64{10.0},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          4.5,
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsNotEq,
			matchType:       ruletypes.AllTheTimes,
			target:          0.0,
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsNotEq,
			matchType:       ruletypes.AllTheTimes,
			target:          0.0,
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
			compareOperator:     ruletypes.ValueIsNotEq,
			matchType:           ruletypes.AllTheTimes,
			target:              0.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 1.0},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsNotEq,
			matchType:       ruletypes.AllTheTimes,
			target:          0.0,
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
			compareOperator:     ruletypes.ValueIsNotEq,
			matchType:           ruletypes.AtleastOnce,
			target:              0.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 1.0},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsNotEq,
			matchType:       ruletypes.AtleastOnce,
			target:          0.0,
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
			compareOperator:     ruletypes.ValueIsNotEq,
			matchType:           ruletypes.AtleastOnce,
			target:              0.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 1.0},
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
			compareOperator:     ruletypes.ValueIsNotEq,
			matchType:           ruletypes.AtleastOnce,
			target:              0.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 1.0},
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
			compareOperator:     ruletypes.ValueIsBelow,
			matchType:           ruletypes.AllTheTimes,
			target:              4,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 1.5},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsBelow,
			matchType:       ruletypes.AllTheTimes,
			target:          4,
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
			compareOperator:     ruletypes.ValueIsBelow,
			matchType:           ruletypes.AtleastOnce,
			target:              4,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 2.5},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsBelow,
			matchType:       ruletypes.AtleastOnce,
			target:          4,
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
			compareOperator:     ruletypes.ValueIsEq,
			matchType:           ruletypes.OnAverage,
			target:              6.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 6.0},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsEq,
			matchType:       ruletypes.OnAverage,
			target:          4.5,
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
			compareOperator:     ruletypes.ValueIsNotEq,
			matchType:           ruletypes.OnAverage,
			target:              4.5,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 6.0},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsNotEq,
			matchType:       ruletypes.OnAverage,
			target:          6.0,
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
			compareOperator:     ruletypes.ValueIsAbove,
			matchType:           ruletypes.OnAverage,
			target:              4.5,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 6.0},
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
			compareOperator:     ruletypes.ValueIsBelow,
			matchType:           ruletypes.OnAverage,
			target:              12.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 6.0},
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
			compareOperator:     ruletypes.ValueIsEq,
			matchType:           ruletypes.InTotal,
			target:              30.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 30.0},
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
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsEq,
			matchType:       ruletypes.InTotal,
			target:          20.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
				},
			},
			expectAlert:         true,
			compareOperator:     ruletypes.ValueIsNotEq,
			matchType:           ruletypes.InTotal,
			target:              9.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 10.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
				},
			},
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsNotEq,
			matchType:       ruletypes.InTotal,
			target:          10.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 10.0},
				},
			},
			expectAlert:         true,
			compareOperator:     ruletypes.ValueIsAbove,
			matchType:           ruletypes.InTotal,
			target:              10.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 20.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 10.0},
				},
			},
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.InTotal,
			target:          20.0,
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 10.0},
				},
			},
			expectAlert:         true,
			compareOperator:     ruletypes.ValueIsBelow,
			matchType:           ruletypes.InTotal,
			target:              30.0,
			expectedAlertSample: qbtypes.TimeSeriesValue{Value: 20.0},
		},
		{
			values: pql.Series{
				Floats: []pql.FPoint{
					{F: 10.0},
					{F: 10.0},
				},
			},
			expectAlert:     false,
			compareOperator: ruletypes.ValueIsBelow,
			matchType:       ruletypes.InTotal,
			target:          20.0,
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		postableRule.RuleCondition.CompareOperator = c.compareOperator
		postableRule.RuleCondition.MatchType = c.matchType
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					TargetValue:     &c.target,
					MatchType:       c.matchType,
					CompareOperator: c.compareOperator,
				},
			},
		}

		externalUrl := mustParseURL(t, "http://localhost:8080")
		rule, err := NewPromRule("69", valuer.GenerateUUID(), &postableRule, logger, nil, externalUrl)
		if err != nil {
			assert.NoError(t, err)
		}

		resultVectors, err := rule.Threshold.Eval(toCommonSeries(c.values), rule.Unit(), ruletypes.EvalData{})
		assert.NoError(t, err)

		// Compare full result vector with expected vector
		actualValues := getVectorValues(resultVectors)
		if c.expectedVectorValues != nil {
			// If expected vector values are specified, compare them exactly
			assert.Equal(t, c.expectedVectorValues, actualValues, "Result vector values don't match expected for case %d", idx)
		} else {
			// Fallback to the old logic for cases without expectedVectorValues
			if c.expectAlert {
				assert.NotEmpty(t, resultVectors, "Expected alert but got no result vectors for case %d", idx)
				// Verify at least one of the result vectors matches the expected alert sample
				if len(resultVectors) > 0 {
					found := false
					for _, sample := range resultVectors {
						if sample.V == c.expectedAlertSample.Value {
							found = true
							break
						}
					}
					assert.True(t, found, "Expected alert sample value %.2f not found in result vectors for case %d. Got values: %v", c.expectedAlertSample.Value, idx, actualValues)
				}
			} else {
				assert.Empty(t, resultVectors, "Expected no alert but got result vectors for case %d", idx)
			}
		}
	}
}

func TestPromRuleUnitCombinations(t *testing.T) {
	// fixed base time for deterministic tests
	baseTime := time.Unix(1700000000, 0)
	evalTime := baseTime.Add(5 * time.Minute)

	postableRule := ruletypes.PostableRule{
		AlertName: "Units test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Query: "test_metric",
						},
					},
				},
			},
		},
	}

	// see Timestamps on base_rule
	evalWindowMs := int64(5 * 60 * 1000) // 5 minutes in ms
	evalTimeMs := evalTime.UnixMilli()
	queryEnd := (evalTimeMs / 60000) * 60000 // truncate to minute
	gridStart := queryEnd - evalWindowMs

	cases := []struct {
		targetUnit string
		yAxisUnit  string
		values     []struct {
			timestamp time.Time
			value     float64
		}
		expectAlerts    int
		compareOperator ruletypes.CompareOperator
		matchType       ruletypes.MatchType
		target          float64
		summaryAny      []string
	}{
		{
			targetUnit: "s",
			yAxisUnit:  "ns",
			values: []struct {
				timestamp time.Time
				value     float64
			}{
				{baseTime, 572588400},                              // 0.57 seconds
				{baseTime.Add(1 * time.Minute), 572386400},         // 0.57 seconds
				{baseTime.Add(2 * time.Minute), 300947400},         // 0.3 seconds
				{baseTime.Add(3 * time.Minute), 299316000},         // 0.3 seconds
				{baseTime.Add(4 * time.Minute), 66640400.00000001}, // 0.06 seconds
			},
			expectAlerts:    0,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          1, // 1 second
		},
		{
			targetUnit: "ms",
			yAxisUnit:  "ns",
			values: []struct {
				timestamp time.Time
				value     float64
			}{
				{baseTime, 572588400},                              // 572.58 ms
				{baseTime.Add(1 * time.Minute), 572386400},         // 572.38 ms
				{baseTime.Add(2 * time.Minute), 300947400},         // 300.94 ms
				{baseTime.Add(3 * time.Minute), 299316000},         // 299.31 ms
				{baseTime.Add(4 * time.Minute), 66640400.00000001}, // 66.64 ms
			},
			expectAlerts:    1,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          200, // 200 ms
			summaryAny: []string{
				"observed metric value is 299 ms",
				"the observed metric value is 573 ms",
				"the observed metric value is 572 ms",
				"the observed metric value is 301 ms",
			},
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "bytes",
			values: []struct {
				timestamp time.Time
				value     float64
			}{
				{baseTime, 2863284053},                             // 2.86 GB
				{baseTime.Add(1 * time.Minute), 2863388842},        // 2.86 GB
				{baseTime.Add(2 * time.Minute), 300947400},         // 0.3 GB
				{baseTime.Add(3 * time.Minute), 299316000},         // 0.3 GB
				{baseTime.Add(4 * time.Minute), 66640400.00000001}, // 66.64 MB
			},
			expectAlerts:    0,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          200, // 200 GB
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "By",
			values: []struct {
				timestamp time.Time
				value     float64
			}{
				{baseTime, 2863284053},                             // 2.86 GB
				{baseTime.Add(1 * time.Minute), 2863388842},        // 2.86 GB
				{baseTime.Add(2 * time.Minute), 300947400},         // 0.3 GB
				{baseTime.Add(3 * time.Minute), 299316000},         // 0.3 GB
				{baseTime.Add(4 * time.Minute), 66640400.00000001}, // 66.64 MB
			},
			expectAlerts:    0,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          200, // 200 GB
		},
		{
			targetUnit: "h",
			yAxisUnit:  "min",
			values: []struct {
				timestamp time.Time
				value     float64
			}{
				{baseTime, 55},                      // 55 minutes
				{baseTime.Add(1 * time.Minute), 57}, // 57 minutes
				{baseTime.Add(2 * time.Minute), 30}, // 30 minutes
				{baseTime.Add(3 * time.Minute), 29}, // 29 minutes
			},
			expectAlerts:    0,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          1, // 1 hour
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

		tsList := make([]int64, len(c.values))
		vList := make([]float64, len(c.values))
		for i, v := range c.values {
			tsList[i] = v.timestamp.UnixMilli()
			vList[i] = v.value
		}
		grid := prometheustest.LastSampleGrid(tsList, vList, gridStart, queryEnd, 60_000, 300_000)

		// args: $1-$3=group-key join conditions, $4-$6=samples conditions
		telemetryStore.Mock().
			ExpectQuery("SELECT gkey").
			WithArgs("test_metric", nil, nil, "test_metric", nil, nil).
			WillReturnRows(cmock.NewRows(prometheustest.GridCols, [][]any{{`[["__name__","test_metric"]]`, grid}}))

		promProvider := prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{Timeout: 2 * time.Minute}, telemetryStore)

		postableRule.RuleCondition.CompareOperator = c.compareOperator
		postableRule.RuleCondition.MatchType = ruletypes.MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.CompositeQuery.Unit = c.yAxisUnit
		postableRule.RuleCondition.TargetUnit = c.targetUnit
		postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					Name:            postableRule.AlertName,
					TargetValue:     &c.target,
					TargetUnit:      c.targetUnit,
					MatchType:       c.matchType,
					CompareOperator: c.compareOperator,
				},
			},
		}
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		externalUrl := mustParseURL(t, "http://localhost:8080")
		rule, err := NewPromRule("69", valuer.GenerateUUID(), &postableRule, logger, promProvider, externalUrl)
		if err != nil {
			assert.NoError(t, err)
			continue
		}

		alertsFound, err := rule.Eval(context.Background(), evalTime)
		if err != nil {
			assert.NoError(t, err)
			continue
		}

		assert.Equal(t, c.expectAlerts, alertsFound, "case %d", idx)
		if c.expectAlerts != 0 {
			foundCount := 0
			for _, item := range rule.Active {
				for _, summary := range c.summaryAny {
					if strings.Contains(item.Annotations.Get("summary"), summary) {
						foundCount++
						break
					}
				}
			}
			assert.Equal(t, c.expectAlerts, foundCount, "case %d", idx)
		}

	}
}

func TestPromRuleNoData(t *testing.T) {
	baseTime := time.Unix(1700000000, 0)
	evalTime := baseTime.Add(5 * time.Minute)

	postableRule := ruletypes.PostableRule{
		AlertName: "No data test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Query: "test_metric",
						},
					},
				},
			},
			AlertOnAbsent: true,
		},
	}

	cases := []struct {
		values []struct {
			timestamp time.Time
			value     float64
		}
		expectNoData bool
	}{
		{
			values: []struct {
				timestamp time.Time
				value     float64
			}{},
			expectNoData: true,
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

		// no rows == no data
		telemetryStore.Mock().
			ExpectQuery("SELECT gkey").
			WithArgs("test_metric", nil, nil, "test_metric", nil, nil).
			WillReturnRows(cmock.NewRows(prometheustest.GridCols, [][]any{}))

		promProvider := prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{Timeout: 2 * time.Minute}, telemetryStore)

		var target float64 = 0
		postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					Name:            postableRule.AlertName,
					TargetValue:     &target,
					MatchType:       ruletypes.AtleastOnce,
					CompareOperator: ruletypes.ValueIsEq,
				},
			},
		}
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		externalUrl := mustParseURL(t, "http://localhost:8080")
		rule, err := NewPromRule("69", valuer.GenerateUUID(), &postableRule, logger, promProvider, externalUrl)
		if err != nil {
			assert.NoError(t, err)
			continue
		}

		alertsFound, err := rule.Eval(context.Background(), evalTime)
		if err != nil {
			assert.NoError(t, err)
			continue
		}

		assert.Equal(t, 1, alertsFound, "case %d", idx)
		for _, item := range rule.Active {
			if c.expectNoData {
				assert.True(t, strings.Contains(item.Labels.Get(ruletypes.AlertNameLabel), "[No data]"), "case %d", idx)
			} else {
				assert.False(t, strings.Contains(item.Labels.Get(ruletypes.AlertNameLabel), "[No data]"), "case %d", idx)
			}
		}

	}
}

func TestMultipleThresholdPromRule(t *testing.T) {
	// fixed base time for deterministic tests
	baseTime := time.Unix(1700000000, 0)
	evalTime := baseTime.Add(5 * time.Minute)

	postableRule := ruletypes.PostableRule{
		AlertName: "Multiple threshold test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{
							Query: "test_metric",
						},
					},
				},
			},
		},
	}

	// see .Timestamps of base rule
	evalWindowMs := int64(5 * 60 * 1000)
	evalTimeMs := evalTime.UnixMilli()
	queryEnd := (evalTimeMs / 60000) * 60000
	gridStart := queryEnd - evalWindowMs

	cases := []struct {
		targetUnit string
		yAxisUnit  string
		values     []struct {
			timestamp time.Time
			value     float64
		}
		expectAlerts    int
		compareOperator ruletypes.CompareOperator
		matchType       ruletypes.MatchType
		target          float64
		secondTarget    float64
		summaryAny      []string
	}{
		{
			targetUnit: "s",
			yAxisUnit:  "ns",
			values: []struct {
				timestamp time.Time
				value     float64
			}{
				{baseTime, 572588400},                              // 0.57 seconds
				{baseTime.Add(1 * time.Minute), 572386400},         // 0.57 seconds
				{baseTime.Add(2 * time.Minute), 300947400},         // 0.3 seconds
				{baseTime.Add(3 * time.Minute), 299316000},         // 0.3 seconds
				{baseTime.Add(4 * time.Minute), 66640400.00000001}, // 0.06 seconds
			},
			expectAlerts:    1,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          1, // 1 second
			secondTarget:    .5,
			summaryAny: []string{
				"observed metric value is 573 ms",
				"observed metric value is 572 ms",
			},
		},
		{
			targetUnit: "ms",
			yAxisUnit:  "ns",
			values: []struct {
				timestamp time.Time
				value     float64
			}{
				{baseTime, 572588400},                              // 572.58 ms
				{baseTime.Add(1 * time.Minute), 572386400},         // 572.38 ms
				{baseTime.Add(2 * time.Minute), 300947400},         // 300.94 ms
				{baseTime.Add(3 * time.Minute), 299316000},         // 299.31 ms
				{baseTime.Add(4 * time.Minute), 66640400.00000001}, // 66.64 ms
			},
			expectAlerts:    2, // One alert per threshold that fires
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          200, // 200 ms
			secondTarget:    500,
			summaryAny: []string{
				"observed metric value is 299 ms",
				"the observed metric value is 573 ms",
				"the observed metric value is 572 ms",
				"the observed metric value is 301 ms",
			},
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "bytes",
			values: []struct {
				timestamp time.Time
				value     float64
			}{
				{baseTime, 2863284053},                             // 2.86 GB
				{baseTime.Add(1 * time.Minute), 2863388842},        // 2.86 GB
				{baseTime.Add(2 * time.Minute), 300947400},         // 0.3 GB
				{baseTime.Add(3 * time.Minute), 299316000},         // 0.3 GB
				{baseTime.Add(4 * time.Minute), 66640400.00000001}, // 66.64 MB
			},
			expectAlerts:    1,
			compareOperator: ruletypes.ValueIsAbove,
			matchType:       ruletypes.AtleastOnce,
			target:          200, // 200 GB
			secondTarget:    2,   // 2GB
			summaryAny: []string{
				"observed metric value is 2.7 GiB",
				"the observed metric value is 0.3 GB",
			},
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

		tsList := make([]int64, len(c.values))
		vList := make([]float64, len(c.values))
		for i, v := range c.values {
			tsList[i] = v.timestamp.UnixMilli()
			vList[i] = v.value
		}
		grid := prometheustest.LastSampleGrid(tsList, vList, gridStart, queryEnd, 60_000, 300_000)

		// args: $1-$3=group-key join conditions, $4-$6=samples conditions
		telemetryStore.Mock().
			ExpectQuery("SELECT gkey").
			WithArgs("test_metric", nil, nil, "test_metric", nil, nil).
			WillReturnRows(cmock.NewRows(prometheustest.GridCols, [][]any{{`[["__name__","test_metric"]]`, grid}}))

		promProvider := prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{Timeout: 2 * time.Minute}, telemetryStore)

		postableRule.RuleCondition.CompareOperator = c.compareOperator
		postableRule.RuleCondition.MatchType = c.matchType
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.CompositeQuery.Unit = c.yAxisUnit
		postableRule.RuleCondition.TargetUnit = c.targetUnit
		postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					Name:            "first_threshold",
					TargetValue:     &c.target,
					TargetUnit:      c.targetUnit,
					MatchType:       c.matchType,
					CompareOperator: c.compareOperator,
				},
				{
					Name:            "second_threshold",
					TargetValue:     &c.secondTarget,
					TargetUnit:      c.targetUnit,
					MatchType:       c.matchType,
					CompareOperator: c.compareOperator,
				},
			},
		}
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		externalUrl := mustParseURL(t, "http://localhost:8080")
		rule, err := NewPromRule("69", valuer.GenerateUUID(), &postableRule, logger, promProvider, externalUrl)
		if err != nil {
			assert.NoError(t, err)
			continue
		}

		alertsFound, err := rule.Eval(context.Background(), evalTime)
		if err != nil {
			assert.NoError(t, err)
			continue
		}

		assert.Equal(t, c.expectAlerts, alertsFound, "case %d", idx)
		if c.expectAlerts != 0 {
			foundCount := 0
			for _, item := range rule.Active {
				for _, summary := range c.summaryAny {
					if strings.Contains(item.Annotations.Get("summary"), summary) {
						foundCount++
						break
					}
				}
			}
			assert.Equal(t, c.expectAlerts, foundCount, "case %d", idx)
		}

	}
}

func TestPromRule_NoData(t *testing.T) {
	evalTime := time.Now()

	postableRule := ruletypes.PostableRule{
		AlertName: "Test no data",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompareOperator: ruletypes.ValueIsAbove,
			MatchType:       ruletypes.AtleastOnce,
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{Query: "test_metric"},
					},
				},
			},
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{{Name: "Test no data"}},
			},
		},
	}

	cases := []struct {
		description   string
		alertOnAbsent bool
		values        []any
		target        float64
		expectAlerts  int
	}{
		{
			description:   "AlertOnAbsent=false",
			alertOnAbsent: false,
			values:        []any{},
			target:        200,
			expectAlerts:  0,
		},
		{
			description:   "AlertOnAbsent=true",
			alertOnAbsent: true,
			values:        []any{},
			target:        200,
			expectAlerts:  1,
		},
	}

	logger := instrumentationtest.New().Logger()

	for _, c := range cases {
		t.Run(c.description, func(t *testing.T) {
			postableRule.RuleCondition.AlertOnAbsent = c.alertOnAbsent

			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

			// no rows == no data
			telemetryStore.Mock().
				ExpectQuery("SELECT gkey").
				WithArgs("test_metric", nil, nil, "test_metric", nil, nil).
				WillReturnRows(cmock.NewRows(prometheustest.GridCols, [][]any{}))

			promProvider := prometheustest.New(
				context.Background(),
				instrumentationtest.New().ToProviderSettings(),
				prometheus.Config{Timeout: 2 * time.Minute},
				telemetryStore,
			)
			defer func() {
			}()

			externalUrl := mustParseURL(t, "http://localhost:8080")
			rule, err := NewPromRule("some-id", valuer.GenerateUUID(), &postableRule, logger, promProvider, externalUrl)
			require.NoError(t, err)

			alertsFound, err := rule.Eval(context.Background(), evalTime)
			require.NoError(t, err)

			assert.Equal(t, c.expectAlerts, alertsFound)
		})
	}
}

func TestPromRule_NoData_AbsentFor(t *testing.T) {
	// 1. Call Eval with data at time t1, to populate lastTimestampWithDatapoints
	// 2. Call Eval without data at time t2
	// 3. Alert fires only if t2 - t1 > AbsentFor

	baseTime := time.Unix(1700000000, 0)
	evalWindow := valuer.MustParseTextDuration("5m")

	// Set target higher than test data (100.0) so regular threshold alerts don't fire
	target := 500.0

	postableRule := ruletypes.PostableRule{
		AlertName: "Test no data with AbsentFor",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: evalWindow,
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompareOperator: ruletypes.ValueIsAbove,
			MatchType:       ruletypes.AtleastOnce,
			AlertOnAbsent:   true,
			Target:          &target,
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{Query: "test_metric"},
					},
				},
			},
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{{
					Name:            "Test no data with AbsentFor",
					TargetValue:     &target,
					MatchType:       ruletypes.AtleastOnce,
					CompareOperator: ruletypes.ValueIsAbove,
				}},
			},
		},
	}

	cases := []struct {
		description        string
		absentFor          uint64        // grace period in minutes
		timeBetweenEvals   time.Duration // time between first eval (with data) and second eval (no data)
		expectAlertOnEval2 int
	}{
		{
			description:        "WithinGracePeriod",
			absentFor:          5,
			timeBetweenEvals:   4 * time.Minute,
			expectAlertOnEval2: 0,
		},
		{
			description:        "AfterGracePeriod",
			absentFor:          5,
			timeBetweenEvals:   6 * time.Minute,
			expectAlertOnEval2: 1,
		},
	}

	logger := instrumentationtest.New().Logger()

	for _, c := range cases {
		t.Run(c.description, func(t *testing.T) {
			postableRule.RuleCondition.AbsentFor = c.absentFor

			// Timestamps for two evaluations
			// t1 is the eval time for first eval, data points are in the past
			t1 := baseTime.Add(5 * time.Minute) // first eval with data
			t2 := t1.Add(c.timeBetweenEvals)    // second eval without data

			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

			// Grid an eval at this time evaluates over (see Timestamps on
			// base_rule).
			calcGrid := func(evalTime time.Time) (int64, int64) {
				gridEnd := (evalTime.UnixMilli() / 60000) * 60000
				return gridEnd - evalWindow.Milliseconds(), gridEnd
			}

			// First eval (t1) - with data: points in the past relative to t1
			gridStart1, gridEnd1 := calcGrid(t1)
			grid1 := prometheustest.LastSampleGrid(
				[]int64{baseTime.UnixMilli(), baseTime.Add(1 * time.Minute).UnixMilli(), baseTime.Add(2 * time.Minute).UnixMilli()},
				[]float64{100, 100, 100},
				gridStart1, gridEnd1, 60_000, 300_000,
			)
			telemetryStore.Mock().
				ExpectQuery("SELECT gkey").
				WithArgs("test_metric", nil, nil, "test_metric", nil, nil).
				WillReturnRows(cmock.NewRows(prometheustest.GridCols, [][]any{{`[["__name__","test_metric"]]`, grid1}}))

			// Second eval (t2) - no data
			telemetryStore.Mock().
				ExpectQuery("SELECT gkey").
				WithArgs("test_metric", nil, nil, "test_metric", nil, nil).
				WillReturnRows(cmock.NewRows(prometheustest.GridCols, [][]any{}))

			promProvider := prometheustest.New(
				context.Background(),
				instrumentationtest.New().ToProviderSettings(),
				prometheus.Config{Timeout: 2 * time.Minute},
				telemetryStore,
			)
			defer func() {
			}()

			externalUrl := mustParseURL(t, "http://localhost:8080")
			rule, err := NewPromRule("some-id", valuer.GenerateUUID(), &postableRule, logger, promProvider, externalUrl)
			require.NoError(t, err)

			// First eval with data - should NOT alert, but populates lastTimestampWithDatapoints
			alertsFound1, err := rule.Eval(context.Background(), t1)
			require.NoError(t, err)
			assert.Equal(t, 0, alertsFound1, "First eval with data should not alert")

			// Second eval without data - should alert based on AbsentFor
			alertsFound2, err := rule.Eval(context.Background(), t2)
			require.NoError(t, err)
			assert.Equal(t, c.expectAlertOnEval2, alertsFound2)
		})
	}
}

func TestPromRuleEval_RequireMinPoints(t *testing.T) {
	// fixed base time for deterministic tests
	baseTime := time.Unix(1700000000, 0)
	evalTime := baseTime.Add(5 * time.Minute)

	evalWindow := valuer.MustParseTextDuration("5m")
	lookBackDelta := time.Minute

	postableRule := ruletypes.PostableRule{
		AlertName: "Unit test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: evalWindow,
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompareOperator: ruletypes.ValueIsAbove,
			MatchType:       ruletypes.AtleastOnce,
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				QueryType: ruletypes.QueryTypePromQL,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypePromQL,
						Spec: qbtypes.PromQuery{Query: "test_metric"},
					},
				},
			},
		},
	}

	sampleTs := []int64{baseTime.UnixMilli(), baseTime.Add(time.Minute).UnixMilli(), baseTime.Add(2 * time.Minute).UnixMilli()}
	sampleVs := []float64{100, 150, 250}
	targetForAlert := 200.0
	targetForNoAlert := 500.0

	// see Timestamps on base_rule
	evalTimeMs := evalTime.UnixMilli()
	queryEnd := (evalTimeMs / 60000) * 60000 // truncate to minute
	gridStart := queryEnd - evalWindow.Milliseconds()

	cases := []struct {
		description       string
		alertCondition    bool
		requireMinPoints  bool
		requiredNumPoints int
		expectAlerts      int
	}{
		{
			description:      "AlertCondition=false, RequireMinPoints=false",
			alertCondition:   false,
			requireMinPoints: false,
			expectAlerts:     0,
		},
		{
			description:      "AlertCondition=true, RequireMinPoints=false",
			alertCondition:   true,
			requireMinPoints: false,
			expectAlerts:     1,
		},
		{
			description:       "AlertCondition=true, RequireMinPoints=true, NumPoints=more_than_required",
			alertCondition:    true,
			requireMinPoints:  true,
			requiredNumPoints: 2,
			expectAlerts:      1,
		},
		{
			description:       "AlertCondition=true, RequireMinPoints=true, NumPoints=same_as_required",
			alertCondition:    true,
			requireMinPoints:  true,
			requiredNumPoints: 3,
			expectAlerts:      1,
		},
		{
			description:       "AlertCondition=true, RequireMinPoints=true, NumPoints=insufficient",
			alertCondition:    true,
			requireMinPoints:  true,
			requiredNumPoints: 4,
			expectAlerts:      0,
		},
	}

	logger := instrumentationtest.New().Logger()

	for _, c := range cases {
		rc := postableRule.RuleCondition

		rc.Target = &targetForNoAlert
		if c.alertCondition {
			rc.Target = &targetForAlert
		}
		rc.RequireMinPoints = c.requireMinPoints
		rc.RequiredNumPoints = c.requiredNumPoints
		rc.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					Name:            postableRule.AlertName,
					TargetValue:     rc.Target,
					MatchType:       rc.MatchType,
					CompareOperator: rc.CompareOperator,
				},
			},
		}

		t.Run(c.description, func(t *testing.T) {
			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})
			grid := prometheustest.LastSampleGrid(sampleTs, sampleVs, gridStart, queryEnd, 60_000, lookBackDelta.Milliseconds())
			telemetryStore.Mock().
				ExpectQuery("SELECT gkey").
				WithArgs("test_metric", nil, nil, "test_metric", nil, nil).
				WillReturnRows(cmock.NewRows(prometheustest.GridCols, [][]any{{`[["__name__","test_metric"]]`, grid}}))
			promProvider := prometheustest.New(
				context.Background(),
				instrumentationtest.New().ToProviderSettings(),
				prometheus.Config{Timeout: 2 * time.Minute, LookbackDelta: lookBackDelta},
				telemetryStore,
			)
			defer func() {
			}()

			externalUrl := mustParseURL(t, "http://localhost:8080")
			rule, err := NewPromRule("some-id", valuer.GenerateUUID(), &postableRule, logger, promProvider, externalUrl)
			require.NoError(t, err)

			alertsFound, err := rule.Eval(context.Background(), evalTime)
			require.NoError(t, err)

			assert.Equal(t, c.expectAlerts, alertsFound)
		})
	}
}
