package rules

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qslabels "github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	pql "github.com/prometheus/prometheus/promql"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
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
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		RuleCondition: &ruletypes.RuleCondition{
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
		values               pql.Series
		expectAlert          bool
		compareOp            string
		matchType            string
		target               float64
		expectedAlertSample  v3.Point
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
			compareOp:            "3", // Equals
			matchType:            "2", // Always
			target:               0.0,
			expectedAlertSample:  v3.Point{Value: 0.0},
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
			compareOp:            "3", // Equals
			matchType:            "2", // Always
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
			compareOp:            "3", // Equals
			matchType:            "2", // Always
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
			expectAlert:          true,
			compareOp:            "3", // Equals
			matchType:            "1", // Once
			target:               0.0,
			expectedAlertSample:  v3.Point{Value: 0.0},
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
			expectAlert:          false,
			compareOp:            "3", // Equals
			matchType:            "1", // Once
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
			compareOp:            "1", // Greater Than
			matchType:            "2", // Always
			target:               1.5,
			expectedAlertSample:  v3.Point{Value: 2.0},
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
			expectAlert:          true,
			compareOp:            "1", // Greater Than
			matchType:            "1", // Once
			target:               4.5,
			expectedAlertSample:  v3.Point{Value: 10.0},
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

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		postableRule.RuleCondition.CompareOp = ruletypes.CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = ruletypes.MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					TargetValue: &c.target,
					MatchType:   ruletypes.MatchType(c.matchType),
					CompareOp:   ruletypes.CompareOp(c.compareOp),
				},
			},
		}

		rule, err := NewPromRule("69", valuer.GenerateUUID(), &postableRule, logger, nil, nil)
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
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query: "test_metric",
					},
				},
			},
		},
	}

	// time_series_v4 cols of interest
	fingerprintCols := []cmock.ColumnType{
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "any(labels)", Type: "String"},
	}

	// samples_v4 columns
	samplesCols := []cmock.ColumnType{
		{Name: "metric_name", Type: "String"},
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "unix_milli", Type: "Int64"},
		{Name: "value", Type: "Float64"},
		{Name: "flags", Type: "UInt32"},
	}

	// see Timestamps on base_rule
	evalWindowMs := int64(5 * 60 * 1000) // 5 minutes in ms
	evalTimeMs := evalTime.UnixMilli()
	queryStart := ((evalTimeMs-2*evalWindowMs)/60000)*60000 + 1 // truncate to minute + 1ms
	queryEnd := (evalTimeMs / 60000) * 60000                    // truncate to minute

	cases := []struct {
		targetUnit string
		yAxisUnit  string
		values     []struct {
			timestamp time.Time
			value     float64
		}
		expectAlerts int
		compareOp    string
		matchType    string
		target       float64
		summaryAny   []string
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
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       1,   // 1 second
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
			expectAlerts: 1,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 ms
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
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 GB
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
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 GB
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
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       1,   // 1 hour
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

		// single fingerprint with labels JSON
		fingerprint := uint64(12345)
		labelsJSON := `{"__name__":"test_metric"}`
		fingerprintData := [][]interface{}{
			{fingerprint, labelsJSON},
		}
		fingerprintRows := cmock.NewRows(fingerprintCols, fingerprintData)

		// create samples data from test case values
		samplesData := make([][]interface{}, len(c.values))
		for i, v := range c.values {
			samplesData[i] = []interface{}{
				"test_metric",
				fingerprint,
				v.timestamp.UnixMilli(),
				v.value,
				uint32(0), // flags - 0 means normal value, 1 means stale, we are not doing staleness tests
			}
		}
		samplesRows := cmock.NewRows(samplesCols, samplesData)

		// args: $1=metric_name, $2=label_name, $3=label_value
		telemetryStore.Mock().
			ExpectQuery("SELECT fingerprint, any").
			WithArgs("test_metric", "__name__", "test_metric").
			WillReturnRows(fingerprintRows)

		// args: $1=metric_name (outer), $2=metric_name (subquery), $3=label_name, $4=label_value, $5=start, $6=end
		telemetryStore.Mock().
			ExpectQuery("SELECT metric_name, fingerprint, unix_milli").
			WithArgs(
				"test_metric",
				"test_metric",
				"__name__",
				"test_metric",
				queryStart,
				queryEnd,
			).
			WillReturnRows(samplesRows)

		promProvider := prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{}, telemetryStore)

		postableRule.RuleCondition.CompareOp = ruletypes.CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = ruletypes.MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.CompositeQuery.Unit = c.yAxisUnit
		postableRule.RuleCondition.TargetUnit = c.targetUnit
		postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					Name:        postableRule.AlertName,
					TargetValue: &c.target,
					TargetUnit:  c.targetUnit,
					MatchType:   ruletypes.MatchType(c.matchType),
					CompareOp:   ruletypes.CompareOp(c.compareOp),
				},
			},
		}
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		options := clickhouseReader.NewOptions("", "", "archiveNamespace")
		reader := clickhouseReader.NewReader(nil, telemetryStore, promProvider, "", time.Duration(time.Second), nil, nil, options)
		rule, err := NewPromRule("69", valuer.GenerateUUID(), &postableRule, logger, reader, promProvider)
		if err != nil {
			assert.NoError(t, err)
			promProvider.Close()
			continue
		}

		retVal, err := rule.Eval(context.Background(), evalTime)
		if err != nil {
			assert.NoError(t, err)
			promProvider.Close()
			continue
		}

		assert.Equal(t, c.expectAlerts, retVal.(int), "case %d", idx)
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

		promProvider.Close()
	}
}

// TODO(abhishekhugetech): enable this
func _Enable_this_after_9146_issue_fix_is_merged_TestPromRuleNoData(t *testing.T) {
	baseTime := time.Unix(1700000000, 0)
	evalTime := baseTime.Add(5 * time.Minute)

	postableRule := ruletypes.PostableRule{
		AlertName: "No data test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeProm,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query: "test_metric",
					},
				},
			},
			AlertOnAbsent: true,
		},
	}

	// time_series_v4 cols of interest
	fingerprintCols := []cmock.ColumnType{
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "any(labels)", Type: "String"},
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

		// no data
		fingerprintData := [][]interface{}{}
		fingerprintRows := cmock.NewRows(fingerprintCols, fingerprintData)

		// no rows == no data
		telemetryStore.Mock().
			ExpectQuery("SELECT fingerprint, any").
			WithArgs("test_metric", "__name__", "test_metric").
			WillReturnRows(fingerprintRows)

		promProvider := prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{}, telemetryStore)

		var target float64 = 0
		postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					Name:        postableRule.AlertName,
					TargetValue: &target,
					MatchType:   ruletypes.AtleastOnce,
					CompareOp:   ruletypes.ValueIsEq,
				},
			},
		}
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		options := clickhouseReader.NewOptions("", "", "archiveNamespace")
		reader := clickhouseReader.NewReader(nil, telemetryStore, promProvider, "", time.Duration(time.Second), nil, nil, options)
		rule, err := NewPromRule("69", valuer.GenerateUUID(), &postableRule, logger, reader, promProvider)
		if err != nil {
			assert.NoError(t, err)
			promProvider.Close()
			continue
		}

		retVal, err := rule.Eval(context.Background(), evalTime)
		if err != nil {
			assert.NoError(t, err)
			promProvider.Close()
			continue
		}

		assert.Equal(t, 1, retVal.(int), "case %d", idx)
		for _, item := range rule.Active {
			if c.expectNoData {
				assert.True(t, strings.Contains(item.Labels.Get(qslabels.AlertNameLabel), "[No data]"), "case %d", idx)
			} else {
				assert.False(t, strings.Contains(item.Labels.Get(qslabels.AlertNameLabel), "[No data]"), "case %d", idx)
			}
		}

		promProvider.Close()
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
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypePromQL,
				PromQueries: map[string]*v3.PromQuery{
					"A": {
						Query: "test_metric",
					},
				},
			},
		},
	}

	fingerprintCols := []cmock.ColumnType{
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "any(labels)", Type: "String"},
	}

	samplesCols := []cmock.ColumnType{
		{Name: "metric_name", Type: "String"},
		{Name: "fingerprint", Type: "UInt64"},
		{Name: "unix_milli", Type: "Int64"},
		{Name: "value", Type: "Float64"},
		{Name: "flags", Type: "UInt32"},
	}

	// see .Timestamps of base rule
	evalWindowMs := int64(5 * 60 * 1000)
	evalTimeMs := evalTime.UnixMilli()
	queryStart := ((evalTimeMs-2*evalWindowMs)/60000)*60000 + 1
	queryEnd := (evalTimeMs / 60000) * 60000

	cases := []struct {
		targetUnit string
		yAxisUnit  string
		values     []struct {
			timestamp time.Time
			value     float64
		}
		expectAlerts int
		compareOp    string
		matchType    string
		target       float64
		secondTarget float64
		summaryAny   []string
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
			expectAlerts: 1,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       1,   // 1 second
			secondTarget: .5,
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
			expectAlerts: 2,   // One alert per threshold that fires
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 ms
			secondTarget: 500,
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
			expectAlerts: 1,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 GB
			secondTarget: 2,   // 2GB
			summaryAny: []string{
				"observed metric value is 2.7 GiB",
				"the observed metric value is 0.3 GB",
			},
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

		fingerprint := uint64(12345)
		labelsJSON := `{"__name__":"test_metric"}`
		fingerprintData := [][]interface{}{
			{fingerprint, labelsJSON},
		}
		fingerprintRows := cmock.NewRows(fingerprintCols, fingerprintData)

		samplesData := make([][]interface{}, len(c.values))
		for i, v := range c.values {
			samplesData[i] = []interface{}{
				"test_metric",
				fingerprint,
				v.timestamp.UnixMilli(),
				v.value,
				uint32(0),
			}
		}
		samplesRows := cmock.NewRows(samplesCols, samplesData)

		telemetryStore.Mock().
			ExpectQuery("SELECT fingerprint, any").
			WithArgs("test_metric", "__name__", "test_metric").
			WillReturnRows(fingerprintRows)

		telemetryStore.Mock().
			ExpectQuery("SELECT metric_name, fingerprint, unix_milli").
			WithArgs(
				"test_metric",
				"test_metric",
				"__name__",
				"test_metric",
				queryStart,
				queryEnd,
			).
			WillReturnRows(samplesRows)

		promProvider := prometheustest.New(context.Background(), instrumentationtest.New().ToProviderSettings(), prometheus.Config{}, telemetryStore)

		postableRule.RuleCondition.CompareOp = ruletypes.CompareOp(c.compareOp)
		postableRule.RuleCondition.MatchType = ruletypes.MatchType(c.matchType)
		postableRule.RuleCondition.Target = &c.target
		postableRule.RuleCondition.CompositeQuery.Unit = c.yAxisUnit
		postableRule.RuleCondition.TargetUnit = c.targetUnit
		postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					Name:        "first_threshold",
					TargetValue: &c.target,
					TargetUnit:  c.targetUnit,
					MatchType:   ruletypes.MatchType(c.matchType),
					CompareOp:   ruletypes.CompareOp(c.compareOp),
				},
				{
					Name:        "second_threshold",
					TargetValue: &c.secondTarget,
					TargetUnit:  c.targetUnit,
					MatchType:   ruletypes.MatchType(c.matchType),
					CompareOp:   ruletypes.CompareOp(c.compareOp),
				},
			},
		}
		postableRule.Annotations = map[string]string{
			"description": "This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})",
			"summary":     "The rule threshold is set to {{$threshold}}, and the observed metric value is {{$value}}",
		}

		options := clickhouseReader.NewOptions("", "", "archiveNamespace")
		reader := clickhouseReader.NewReader(nil, telemetryStore, promProvider, "", time.Duration(time.Second), nil, nil, options)
		rule, err := NewPromRule("69", valuer.GenerateUUID(), &postableRule, logger, reader, promProvider)
		if err != nil {
			assert.NoError(t, err)
			promProvider.Close()
			continue
		}

		retVal, err := rule.Eval(context.Background(), evalTime)
		if err != nil {
			assert.NoError(t, err)
			promProvider.Close()
			continue
		}

		assert.Equal(t, c.expectAlerts, retVal.(int), "case %d", idx)
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

		promProvider.Close()
	}
}
