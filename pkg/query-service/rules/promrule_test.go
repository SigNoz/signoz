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
	"github.com/prometheus/prometheus/model/labels"
	pql "github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

// populateTSDB is a helper function to populate TSDB with test data
func populateTSDB(provider *prometheustest.Provider, metricName string, lbls labels.Labels, points []struct {
	timestamp time.Time
	value     float64
}) error {
	db := provider.DB()
	app := db.Appender(context.Background())

	var ref storage.SeriesRef
	var err error
	for _, point := range points {
		ref, err = app.Append(ref, lbls, point.timestamp.UnixMilli(), point.value)
		if err != nil {
			app.Rollback()
			return err
		}
	}

	return app.Commit()
}

func TestPromRuleUnitCombinations(t *testing.T) {
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
				{time.Now(), 572588400},                              // 0.57 seconds
				{time.Now().Add(1 * time.Second), 572386400},         // 0.57 seconds
				{time.Now().Add(2 * time.Second), 300947400},         // 0.3 seconds
				{time.Now().Add(3 * time.Second), 299316000},         // 0.3 seconds
				{time.Now().Add(4 * time.Second), 66640400.00000001}, // 0.06 seconds
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
				{time.Now(), 572588400},                              // 572.58 ms
				{time.Now().Add(1 * time.Second), 572386400},         // 572.38 ms
				{time.Now().Add(2 * time.Second), 300947400},         // 300.94 ms
				{time.Now().Add(3 * time.Second), 299316000},         // 299.31 ms
				{time.Now().Add(4 * time.Second), 66640400.00000001}, // 66.64 ms
			},
			expectAlerts: 4,
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
				{time.Now(), 2863284053},                             // 2.86 GB
				{time.Now().Add(1 * time.Second), 2863388842},        // 2.86 GB
				{time.Now().Add(2 * time.Second), 300947400},         // 0.3 GB
				{time.Now().Add(3 * time.Second), 299316000},         // 0.3 GB
				{time.Now().Add(4 * time.Second), 66640400.00000001}, // 66.64 MB
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
				{time.Now(), 2863284053},                             // 2.86 GB
				{time.Now().Add(1 * time.Second), 2863388842},        // 2.86 GB
				{time.Now().Add(2 * time.Second), 300947400},         // 0.3 GB
				{time.Now().Add(3 * time.Second), 299316000},         // 0.3 GB
				{time.Now().Add(4 * time.Second), 66640400.00000001}, // 66.64 MB
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
				{time.Now(), 55},                      // 55 minutes
				{time.Now().Add(1 * time.Minute), 57}, // 57 minutes
				{time.Now().Add(2 * time.Minute), 30}, // 30 minutes
				{time.Now().Add(3 * time.Minute), 29}, // 29 minutes
			},
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       1,   // 1 hour
		},
	}

	logger := instrumentationtest.New().Logger()
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	for idx, c := range cases {
		promProvider := prometheustest.New(logger, prometheus.Config{})
		defer promProvider.Close()

		// Populate TSDB with test data
		lbls := labels.FromStrings("__name__", "test_metric")
		err := populateTSDB(promProvider, "test_metric", lbls, c.values)
		require.NoError(t, err)

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
			continue
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
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
	}
}

func TestPromRuleNoData(t *testing.T) {
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
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	for idx, c := range cases {
		promProvider := prometheustest.New(logger, prometheus.Config{})
		defer promProvider.Close()

		// Don't populate TSDB - empty result
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
			continue
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
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
	}
}

func TestMultipleThresholdPromRule(t *testing.T) {
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
				{time.Now(), 572588400},                              // 0.57 seconds
				{time.Now().Add(1 * time.Second), 572386400},         // 0.57 seconds
				{time.Now().Add(2 * time.Second), 300947400},         // 0.3 seconds
				{time.Now().Add(3 * time.Second), 299316000},         // 0.3 seconds
				{time.Now().Add(4 * time.Second), 66640400.00000001}, // 0.06 seconds
			},
			expectAlerts: 2,
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
				{time.Now(), 572588400},                              // 572.58 ms
				{time.Now().Add(1 * time.Second), 572386400},         // 572.38 ms
				{time.Now().Add(2 * time.Second), 300947400},         // 300.94 ms
				{time.Now().Add(3 * time.Second), 299316000},         // 299.31 ms
				{time.Now().Add(4 * time.Second), 66640400.00000001}, // 66.64 ms
			},
			expectAlerts: 6,   // Expects 6 values exceed 200ms (572.58, 572.38, 300.94, 299.31) + 2 values exceed 500ms (572.58, 572.38)
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
				{time.Now(), 2863284053},                             // 2.86 GB
				{time.Now().Add(1 * time.Second), 2863388842},        // 2.86 GB
				{time.Now().Add(2 * time.Second), 300947400},         // 0.3 GB
				{time.Now().Add(3 * time.Second), 299316000},         // 0.3 GB
				{time.Now().Add(4 * time.Second), 66640400.00000001}, // 66.64 MB
			},
			expectAlerts: 2,
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
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	for idx, c := range cases {
		promProvider := prometheustest.New(logger, prometheus.Config{})
		defer promProvider.Close()

		// Populate TSDB with test data
		lbls := labels.FromStrings("__name__", "test_metric")
		err := populateTSDB(promProvider, "test_metric", lbls, c.values)
		require.NoError(t, err)

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
			continue
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
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
	}
}

func TestPopulateTSDBAndQuery(t *testing.T) {
	logger := instrumentationtest.New().Logger()
	promProvider := prometheustest.New(logger, prometheus.Config{})
	defer promProvider.Close()

	// Test data to populate
	metricName := "test_metric"
	baseTime := time.Now().Truncate(time.Second) // Round to second for alignment
	testPoints := []struct {
		timestamp time.Time
		value     float64
	}{
		{baseTime, 10.5},
		{baseTime.Add(1 * time.Second), 20.3},
		{baseTime.Add(2 * time.Second), 15.7},
		{baseTime.Add(3 * time.Second), 25.1},
		{baseTime.Add(4 * time.Second), 18.9},
	}

	// Populate TSDB with test data
	lbls := labels.FromStrings("__name__", metricName)
	err := populateTSDB(promProvider, metricName, lbls, testPoints)
	require.NoError(t, err)

	ctx := context.Background()

	// Query using instant queries at each insertion timestamp to verify exact data
	for i, testPoint := range testPoints {
		qry, err := promProvider.Engine().NewInstantQuery(
			ctx,
			promProvider.Storage(),
			nil,
			metricName,
			testPoint.timestamp,
		)
		require.NoError(t, err, "Failed to create instant query for point %d", i)

		res := qry.Exec(ctx)
		require.NoError(t, res.Err, "Query execution failed for point %d", i)

		// Get the vector result (instant queries return vectors)
		// Access res.Value and type assert to promql.Vector
		vector, ok := res.Value.(pql.Vector)
		require.True(t, ok, "Expected vector result for point %d, got %T", i, res.Value)
		require.Len(t, vector, 1, "Expected exactly one sample for point %d", i)

		sample := vector[0]
		require.Equal(t, metricName, sample.Metric.Get("__name__"), "Metric name should match for point %d", i)
		assert.InDelta(t, testPoint.value, sample.F, 0.001, "Value mismatch for point %d", i)
		// Timestamp should be at or before the query time
		assert.LessOrEqual(t, sample.T, testPoint.timestamp.UnixMilli(), "Sample timestamp should be <= query time for point %d", i)

		qry.Close()
	}

	// Also test range query to verify we can query a time range
	query := metricName
	startTime := baseTime.Add(-500 * time.Millisecond)
	endTime := baseTime.Add(5 * time.Second)
	step := 1 * time.Second

	qry, err := promProvider.Engine().NewRangeQuery(
		ctx,
		promProvider.Storage(),
		nil,
		query,
		startTime,
		endTime,
		step,
	)
	require.NoError(t, err)
	defer qry.Close()

	res := qry.Exec(ctx)
	require.NoError(t, res.Err)

	// Get the matrix result
	matrix, err := res.Matrix()
	require.NoError(t, err)
	require.Len(t, matrix, 1, "Expected exactly one series")

	series := matrix[0]
	require.NotEmpty(t, series.Floats, "Expected at least some data points from range query")

	// Verify labels
	require.Equal(t, metricName, series.Metric.Get("__name__"), "Metric name should match")

	// Verify that values from our test data appear in the range query result
	expectedValues := make(map[float64]bool)
	for _, point := range testPoints {
		expectedValues[point.value] = true
	}

	foundValues := make(map[float64]bool)
	for _, point := range series.Floats {
		// Check if this value matches any of our expected values (within tolerance)
		for expectedVal := range expectedValues {
			if point.F >= expectedVal-0.01 && point.F <= expectedVal+0.01 {
				foundValues[expectedVal] = true
				break
			}
		}
	}

	// We should find at least some of the values we inserted
	assert.Greater(t, len(foundValues), 0, "Should find at least one expected value in range query result")
}
