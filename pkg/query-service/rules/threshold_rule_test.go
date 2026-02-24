package rules

import (
	"context"
	"fmt"
	"math"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// mockQuerierV5 implements querierV5.Querier for testing.
type mockQuerierV5 struct {
	response *qbtypes.QueryRangeResponse
}

func (m *mockQuerierV5) QueryRange(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest) (*qbtypes.QueryRangeResponse, error) {
	return m.response, nil
}

func (m *mockQuerierV5) QueryRawStream(ctx context.Context, orgID valuer.UUID, req *qbtypes.QueryRangeRequest, client *qbtypes.RawStream) {
}

// rowsToTimeSeriesData converts old test row data ([][]any with columns {value float64, attr string, timestamp time.Time})
// into a v5 TimeSeriesData format suitable for the mockQuerierV5.
// All rows are grouped into a single TimeSeries with multiple TimeSeriesValues,
// matching the real v5 querier behavior where aggregated data for the same
// metric/group is returned as a single time series.
func rowsToTimeSeriesData(queryName string, rows [][]any) *qbtypes.TimeSeriesData {
	if len(rows) == 0 {
		return &qbtypes.TimeSeriesData{
			QueryName:    queryName,
			Aggregations: []*qbtypes.AggregationBucket{},
		}
	}

	values := make([]*qbtypes.TimeSeriesValue, 0, len(rows))
	for _, row := range rows {
		val := row[0].(float64)
		ts := row[2].(time.Time)
		values = append(values, &qbtypes.TimeSeriesValue{
			Timestamp: ts.UnixMilli(),
			Value:     val,
		})
	}

	return &qbtypes.TimeSeriesData{
		QueryName: queryName,
		Aggregations: []*qbtypes.AggregationBucket{{
			Series: []*qbtypes.TimeSeries{{
				Values: values,
			}},
		}},
	}
}

// newTestReader creates a minimal reader for tests that need RecordRuleStateHistory support.
func newTestReader() *clickhouseReader.ClickHouseReader {
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, nil)
	options := clickhouseReader.NewOptions("primaryNamespace")
	return clickhouseReader.NewReader(nil, telemetryStore, nil, "", time.Second, nil, nil, options)
}

// newMockQuerierV5ForRows creates a mockQuerierV5 from old-format test rows.
func newMockQuerierV5ForRows(queryName string, rows [][]any) *mockQuerierV5 {
	tsData := rowsToTimeSeriesData(queryName, rows)
	return &mockQuerierV5{
		response: &qbtypes.QueryRangeResponse{
			Data: qbtypes.QueryData{
				Results: []any{tsData},
			},
		},
	}
}

func TestThresholdRuleEvalBackwardCompat(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Eval Backward Compatibility Test without recovery target",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range tcThresholdRuleEvalNoRecoveryTarget {
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(valuer.MustParseTextDuration("2m")))
		if err != nil {
			assert.NoError(t, err)
		}

		values := c.values
		for i := range values.Values {
			values.Values[i].Timestamp = time.Now().UnixMilli()
		}

		resultVectors, err := rule.Threshold.Eval(c.values, rule.Unit(), ruletypes.EvalData{
			ActiveAlerts: map[uint64]struct{}{},
		})
		assert.NoError(t, err, "Test case %d", idx)

		// Compare result vectors with expected behavior
		if c.expectAlert {
			assert.NotEmpty(t, resultVectors, "Expected alert but got no result vectors for case %d", idx)
			if len(resultVectors) > 0 {
				found := false
				for _, sample := range resultVectors {
					if sample.V == c.expectedAlertSample {
						found = true
						break
					}
				}
				assert.True(t, found, "Expected alert sample value %.2f not found in result vectors for case %d. Got values: %v", c.expectedAlertSample, idx, getVectorValues(resultVectors))
			}
		} else {
			assert.Empty(t, resultVectors, "Expected no alert but got result vectors for case %d", idx)
		}
	}
}

func TestNormalizeLabelName(t *testing.T) {
	cases := []struct {
		labelName string
		expected  string
	}{
		{
			labelName: "label",
			expected:  "label",
		},
		{
			labelName: "label.with.dots",
			expected:  "label_with_dots",
		},
		{
			labelName: "label-with-dashes",
			expected:  "label_with_dashes",
		},
		{
			labelName: "labelwithnospaces",
			expected:  "labelwithnospaces",
		},
		{
			labelName: "label with spaces",
			expected:  "label_with_spaces",
		},
		{
			labelName: "label with spaces and .dots",
			expected:  "label_with_spaces_and__dots",
		},
		{
			labelName: "label with spaces and -dashes",
			expected:  "label_with_spaces_and__dashes",
		},
	}

	for _, c := range cases {
		assert.Equal(t, c.expected, common.NormalizeLabelName(c.labelName))
	}
}

func TestPrepareLinksToLogsV5(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Tricky Condition Tests",
		AlertType: ruletypes.AlertTypeLogs,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 1 * time.Minute},
							Aggregations: []qbtypes.LogAggregation{
								{
									Expression: "count()",
								},
							},
							Filter: &qbtypes.Filter{
								Expression: "service.name EXISTS",
							},
							Signal: telemetrytypes.SignalLogs,
						},
					},
				},
			},
			CompareOp:     "4", // Not Equals
			MatchType:     "1", // Once
			Target:        &[]float64{0.0}[0],
			SelectedQuery: "A",
		},
		Version: "v5",
	}

	logger := instrumentationtest.New().Logger()
	postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
		Kind: ruletypes.BasicThresholdKind,
		Spec: ruletypes.BasicRuleThresholds{
			{
				TargetValue: postableRule.RuleCondition.Target,
				MatchType:   postableRule.RuleCondition.MatchType,
				CompareOp:   postableRule.RuleCondition.CompareOp,
			},
		},
	}
	rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(valuer.MustParseTextDuration("2m")))
	if err != nil {
		assert.NoError(t, err)
	}

	ts := time.UnixMilli(1753527163000)

	link := rule.prepareLinksToLogs(context.Background(), ts, labels.Labels{})
	assert.Contains(t, link, "compositeQuery=%257B%2522queryType%2522%253A%2522builder%2522%252C%2522builder%2522%253A%257B%2522queryData%2522%253A%255B%257B%2522queryName%2522%253A%2522A%2522%252C%2522stepInterval%2522%253A60%252C%2522dataSource%2522%253A%2522logs%2522%252C%2522aggregateOperator%2522%253A%2522noop%2522%252C%2522aggregateAttribute%2522%253A%257B%2522key%2522%253A%2522%2522%252C%2522dataType%2522%253A%2522%2522%252C%2522type%2522%253A%2522%2522%252C%2522isColumn%2522%253Afalse%252C%2522isJSON%2522%253Afalse%257D%252C%2522expression%2522%253A%2522A%2522%252C%2522disabled%2522%253Afalse%252C%2522limit%2522%253A0%252C%2522offset%2522%253A0%252C%2522pageSize%2522%253A0%252C%2522ShiftBy%2522%253A0%252C%2522IsAnomaly%2522%253Afalse%252C%2522QueriesUsedInFormula%2522%253Anull%252C%2522filter%2522%253A%257B%2522expression%2522%253A%2522service.name%2BEXISTS%2522%257D%257D%255D%252C%2522queryFormulas%2522%253A%255B%255D%257D%257D&timeRange=%7B%22start%22%3A1753526700000%2C%22end%22%3A1753527000000%2C%22pageSize%22%3A100%7D&startTime=1753526700000&endTime=1753527000000&options=%7B%22maxLines%22%3A0%2C%22format%22%3A%22%22%2C%22selectColumns%22%3Anull%7D")
}

func TestPrepareLinksToTracesV5(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Tricky Condition Tests",
		AlertType: ruletypes.AlertTypeTraces,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
							Name:         "A",
							StepInterval: qbtypes.Step{Duration: 1 * time.Minute},
							Aggregations: []qbtypes.TraceAggregation{
								{
									Expression: "count()",
								},
							},
							Filter: &qbtypes.Filter{
								Expression: "service.name EXISTS",
							},
							Signal: telemetrytypes.SignalTraces,
						},
					},
				},
			},
			CompareOp:     "4", // Not Equals
			MatchType:     "1", // Once
			Target:        &[]float64{0.0}[0],
			SelectedQuery: "A",
		},
		Version: "v5",
	}

	logger := instrumentationtest.New().Logger()
	postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
		Kind: ruletypes.BasicThresholdKind,
		Spec: ruletypes.BasicRuleThresholds{
			{
				TargetValue: postableRule.RuleCondition.Target,
				MatchType:   postableRule.RuleCondition.MatchType,
				CompareOp:   postableRule.RuleCondition.CompareOp,
			},
		},
	}
	rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(valuer.MustParseTextDuration("2m")))
	if err != nil {
		assert.NoError(t, err)
	}

	ts := time.UnixMilli(1753527163000)

	link := rule.prepareLinksToTraces(context.Background(), ts, labels.Labels{})
	assert.Contains(t, link, "compositeQuery=%257B%2522queryType%2522%253A%2522builder%2522%252C%2522builder%2522%253A%257B%2522queryData%2522%253A%255B%257B%2522queryName%2522%253A%2522A%2522%252C%2522stepInterval%2522%253A60%252C%2522dataSource%2522%253A%2522traces%2522%252C%2522aggregateOperator%2522%253A%2522noop%2522%252C%2522aggregateAttribute%2522%253A%257B%2522key%2522%253A%2522%2522%252C%2522dataType%2522%253A%2522%2522%252C%2522type%2522%253A%2522%2522%252C%2522isColumn%2522%253Afalse%252C%2522isJSON%2522%253Afalse%257D%252C%2522expression%2522%253A%2522A%2522%252C%2522disabled%2522%253Afalse%252C%2522limit%2522%253A0%252C%2522offset%2522%253A0%252C%2522pageSize%2522%253A0%252C%2522ShiftBy%2522%253A0%252C%2522IsAnomaly%2522%253Afalse%252C%2522QueriesUsedInFormula%2522%253Anull%252C%2522filter%2522%253A%257B%2522expression%2522%253A%2522service.name%2BEXISTS%2522%257D%257D%255D%252C%2522queryFormulas%2522%253A%255B%255D%257D%257D&timeRange=%7B%22start%22%3A1753526700000000000%2C%22end%22%3A1753527000000000000%2C%22pageSize%22%3A100%7D&startTime=1753526700000000000&endTime=1753527000000000000&options=%7B%22maxLines%22%3A0%2C%22format%22%3A%22%22%2C%22selectColumns%22%3Anull%7D")
}

func TestThresholdRuleLabelNormalization(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Tricky Condition Tests",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	cases := []struct {
		values      qbtypes.TimeSeries
		expectAlert bool
		compareOp   string
		matchType   string
		target      float64
	}{
		// Test cases for Equals Always
		{
			values: qbtypes.TimeSeries{
				Values: []*qbtypes.TimeSeriesValue{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
				Labels: []*qbtypes.Label{
					{Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"}, Value: "frontend"},
				},
			},
			expectAlert: true,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(valuer.MustParseTextDuration("2m")))
		if err != nil {
			assert.NoError(t, err)
		}

		values := c.values
		for i := range values.Values {
			values.Values[i].Timestamp = time.Now().UnixMilli()
		}

		vector, err := rule.Threshold.Eval(c.values, rule.Unit(), ruletypes.EvalData{})
		assert.NoError(t, err)

		for name, value := range c.values.LabelsMap() {
			for _, sample := range vector {
				assert.Equal(t, value, sample.Metric.Get(name))
			}
		}

		// Get result vectors from threshold evaluation
		resultVectors, err := rule.Threshold.Eval(c.values, rule.Unit(), ruletypes.EvalData{})
		assert.NoError(t, err, "Test case %d", idx)

		// Compare result vectors with expected behavior
		if c.expectAlert {
			assert.NotEmpty(t, resultVectors, "Expected alert but got no result vectors for case %d", idx)
			// For this test, we don't have expectedAlertSample, so just verify vectors exist
		} else {
			assert.Empty(t, resultVectors, "Expected no alert but got result vectors for case %d", idx)
		}
	}
}

func TestThresholdRuleUnitCombinations(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Units test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "signoz_calls_total",
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	cases := []struct {
		targetUnit   string
		yAxisUnit    string
		values       [][]any
		expectAlerts int
		compareOp    string
		matchType    string
		target       float64
		summaryAny   []string
	}{
		{
			targetUnit: "s",
			yAxisUnit:  "ns",
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 0.57 seconds
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 0.57 seconds
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 seconds
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 seconds
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 0.06 seconds
			},
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       1,   // 1 second
		},
		{
			targetUnit: "ms",
			yAxisUnit:  "ns",
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 572.58 ms
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 572.38 ms
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 300.94 ms
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 299.31 ms
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 ms
			},
			expectAlerts: 1,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 ms
			summaryAny: []string{
				"the observed metric value is 573 ms",
			},
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "bytes",
			values: [][]interface{}{
				{float64(2863284053), "attr", time.Now()},                             // 2.86 GB
				{float64(2863388842), "attr", time.Now().Add(1 * time.Second)},        // 2.86 GB
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 GB
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 GB
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 MB
			},
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 GB
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "By",
			values: [][]interface{}{
				{float64(2863284053), "attr", time.Now()},                             // 2.86 GB
				{float64(2863388842), "attr", time.Now().Add(1 * time.Second)},        // 2.86 GB
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 GB
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 GB
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 MB
			},
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 GB
		},
		{
			targetUnit: "h",
			yAxisUnit:  "min",
			values: [][]interface{}{
				{float64(55), "attr", time.Now()},                      // 55 minutes
				{float64(57), "attr", time.Now().Add(1 * time.Minute)}, // 57 minutes
				{float64(30), "attr", time.Now().Add(2 * time.Minute)}, // 30 minutes
				{float64(29), "attr", time.Now().Add(3 * time.Minute)}, // 29 minutes
			},
			expectAlerts: 0,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       1,   // 1 hour
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		mock := newMockQuerierV5ForRows("A", c.values)
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, newTestReader(), mock, logger)
		if err != nil {
			assert.NoError(t, err)
		}

		alertsFound, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
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

func TestThresholdRuleNoData(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "No data test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "signoz_calls_total",
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
			AlertOnAbsent: true,
		},
	}
	cases := []struct {
		values       [][]any
		expectNoData bool
	}{
		{
			values:       [][]any{},
			expectNoData: true,
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		mock := newMockQuerierV5ForRows("A", c.values)
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, newTestReader(), mock, logger)
		if err != nil {
			assert.NoError(t, err)
		}

		alertsFound, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		assert.Equal(t, 1, alertsFound, "case %d", idx)
		for _, item := range rule.Active {
			if c.expectNoData {
				assert.True(t, strings.Contains(item.Labels.Get(labels.AlertNameLabel), "[No data]"), "case %d", idx)
			} else {
				assert.False(t, strings.Contains(item.Labels.Get(labels.AlertNameLabel), "[No data]"), "case %d", idx)
			}
		}
	}
}

func TestThresholdRuleTracesLink(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Traces link test",
		AlertType: ruletypes.AlertTypeTraces,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "durationNano",
						},
						AggregateOperator: v3.AggregateOperatorP95,
						DataSource:        v3.DataSourceTraces,
						Expression:        "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "httpMethod", IsColumn: true, Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeString},
									Value:    "GET",
									Operator: v3.FilterOperatorEqual,
								},
							},
						},
					},
				},
			},
		},
	}
	logger := instrumentationtest.New().Logger()

	for idx, c := range testCases {
		mock := newMockQuerierV5ForRows("A", c.values)
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, newTestReader(), mock, logger)
		if err != nil {
			assert.NoError(t, err)
		}

		alertsFound, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		assert.Equal(t, c.expectAlerts, alertsFound, "case %d", idx)
	}
}

func TestThresholdRuleLogsLink(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Logs link test",
		AlertType: ruletypes.AlertTypeLogs,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "component",
						},
						AggregateOperator: v3.AggregateOperatorCountDistinct,
						DataSource:        v3.DataSourceLogs,
						Expression:        "A",
						Filters: &v3.FilterSet{
							Operator: "AND",
							Items: []v3.FilterItem{
								{
									Key:      v3.AttributeKey{Key: "k8s.container.name", IsColumn: false, Type: v3.AttributeKeyTypeTag, DataType: v3.AttributeKeyDataTypeString},
									Value:    "testcontainer",
									Operator: v3.FilterOperatorEqual,
								},
							},
						},
					},
				},
			},
		},
	}
	logger := instrumentationtest.New().Logger()

	for idx, c := range testCases {
		mock := newMockQuerierV5ForRows("A", c.values)
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, newTestReader(), mock, logger)
		if err != nil {
			assert.NoError(t, err)
		}

		alertsFound, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		assert.Equal(t, c.expectAlerts, alertsFound, "case %d", idx)
	}
}

func TestMultipleThresholdRule(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Multiple threshold test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "signoz_calls_total",
						},
						AggregateOperator: v3.AggregateOperatorSumRate,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	cases := []struct {
		targetUnit   string
		yAxisUnit    string
		values       [][]any
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
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 0.57 seconds
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 0.57 seconds
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 seconds
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 seconds
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 0.06 seconds
			},
			expectAlerts: 1,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       1,   // 1 second
			secondTarget: .5,
			summaryAny: []string{
				"observed metric value is 573 ms",
			},
		},
		{
			targetUnit: "ms",
			yAxisUnit:  "ns",
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 572.58 ms
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 572.38 ms
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 300.94 ms
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 299.31 ms
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 ms
			},
			expectAlerts: 2,   // 1 series × 2 thresholds: first match (572.58ms) exceeds both 200ms and 500ms
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 ms
			secondTarget: 500,
			summaryAny: []string{
				"the observed metric value is 573 ms",
			},
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "bytes",
			values: [][]interface{}{
				{float64(2863284053), "attr", time.Now()},                             // 2.86 GB
				{float64(2863388842), "attr", time.Now().Add(1 * time.Second)},        // 2.86 GB
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 GB
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 GB
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 MB
			},
			expectAlerts: 1,
			compareOp:    "1", // Above
			matchType:    "1", // Once
			target:       200, // 200 GB
			secondTarget: 2,   // 2GB
			summaryAny: []string{
				"observed metric value is 2.7 GiB",
			},
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		mock := newMockQuerierV5ForRows("A", c.values)
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, newTestReader(), mock, logger)
		if err != nil {
			assert.NoError(t, err)
		}

		alertsFound, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
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

func TestThresholdRuleEval_BasicCases(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Eval Recovery Threshold Test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	runEvalTests(t, postableRule, tcThresholdRuleEval)
}

func TestThresholdRuleEval_MatchPlusCompareOps(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Eval Match Plus Compare Ops Threshold Test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	runEvalTests(t, postableRule, tcThresholdRuleEvalMatchPlusCompareOps)
}

// TestThresholdRuleEval_SendUnmatchedBypassesRecovery tests the case where the sendUnmatched is true and the recovery target is met.
// In this case, the rule should return the first sample as sendUnmatched is supposed to be used in tests and in case of tests
// recovery target is expected to be present. This test make sure this behavior is working as expected.
func TestThresholdRuleEval_SendUnmatchedBypassesRecovery(t *testing.T) {
	target := 10.0
	recovery := 4.0

	postableRule := ruletypes.PostableRule{
		AlertName: "Send unmatched bypass recovery",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
		Kind: ruletypes.BasicThresholdKind,
		Spec: ruletypes.BasicRuleThresholds{
			{
				Name:           "primary",
				TargetValue:    &target,
				RecoveryTarget: &recovery,
				MatchType:      ruletypes.AtleastOnce,
				CompareOp:      ruletypes.ValueIsAbove,
			},
		},
	}

	logger := instrumentationtest.New().Logger()
	rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(valuer.MustParseTextDuration("2m")))
	require.NoError(t, err)

	now := time.Now()
	series := qbtypes.TimeSeries{
		Values: []*qbtypes.TimeSeriesValue{
			{Timestamp: now.UnixMilli(), Value: 3},
			{Timestamp: now.Add(time.Minute).UnixMilli(), Value: 4},
			{Timestamp: now.Add(2 * time.Minute).UnixMilli(), Value: 5},
		},
		Labels: []*qbtypes.Label{
			{Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"}, Value: "frontend"},
		},
	}

	alertLabels := ruletypes.PrepareSampleLabelsForRule(series.LabelsMap(), "primary")
	activeAlerts := map[uint64]struct{}{alertLabels.Hash(): {}}

	resultVectors, err := rule.Threshold.Eval(series, rule.Unit(), ruletypes.EvalData{
		ActiveAlerts:  activeAlerts,
		SendUnmatched: true,
	})
	require.NoError(t, err)
	require.Len(t, resultVectors, 1, "expected unmatched sample to be returned")

	smpl := resultVectors[0]
	assert.Equal(t, float64(3), smpl.V)
	assert.False(t, smpl.IsRecovering, "unmatched path should not mark sample as recovering")
	assert.Equal(t, float64(4), *smpl.RecoveryTarget, "unmatched path should set recovery target")
	assert.InDelta(t, target, smpl.Target, 0.01)
	assert.Equal(t, "primary", smpl.Metric.Get(ruletypes.LabelThresholdName))
}

func intPtr(v int) *int {
	return &v
}

// TestThresholdRuleEval_SendUnmatchedVariants tests the different variants of sendUnmatched behavior.
// It tests the case where sendUnmatched is true, false.
func TestThresholdRuleEval_SendUnmatchedVariants(t *testing.T) {
	target := 10.0
	recovery := 5.0
	postableRule := ruletypes.PostableRule{
		AlertName: "Send unmatched variants",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	now := time.Now()

	tests := []recoveryTestCase{
		{
			description: "sendUnmatched returns first valid point",
			values: qbtypes.TimeSeries{
				Values: []*qbtypes.TimeSeriesValue{
					{Timestamp: now.UnixMilli(), Value: 3},
					{Timestamp: now.Add(time.Minute).UnixMilli(), Value: 4},
				},
				Labels: []*qbtypes.Label{
					{Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"}, Value: "frontend"},
				},
			},
			compareOp:      string(ruletypes.ValueIsAbove),
			matchType:      string(ruletypes.AtleastOnce),
			target:         target,
			recoveryTarget: &recovery,
			thresholdName:  "primary",
			// Since sendUnmatched is true, the rule should return the first valid point
			// even if it doesn't match the rule condition with current target value of 10.0
			sendUnmatched:       true,
			expectSamples:       intPtr(1),
			expectedSampleValue: 3,
		},
		{
			description: "sendUnmatched false suppresses unmatched",
			values: qbtypes.TimeSeries{
				Values: []*qbtypes.TimeSeriesValue{
					{Timestamp: now.UnixMilli(), Value: 3},
					{Timestamp: now.Add(time.Minute).UnixMilli(), Value: 4},
				},
				Labels: []*qbtypes.Label{
					{Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"}, Value: "frontend"},
				},
			},
			compareOp:      string(ruletypes.ValueIsAbove),
			matchType:      string(ruletypes.AtleastOnce),
			target:         target,
			recoveryTarget: &recovery,
			thresholdName:  "primary",
			// Since sendUnmatched is false, the rule should not return any samples
			sendUnmatched: false,
			expectSamples: intPtr(0),
		},
		{
			description: "sendUnmatched skips NaN and uses next point",
			values: qbtypes.TimeSeries{
				Values: []*qbtypes.TimeSeriesValue{
					{Timestamp: now.UnixMilli(), Value: math.NaN()},
					{Timestamp: now.Add(time.Minute).UnixMilli(), Value: math.Inf(1)},
					{Timestamp: now.Add(2 * time.Minute).UnixMilli(), Value: 7},
				},
				Labels: []*qbtypes.Label{
					{Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"}, Value: "frontend"},
				},
			},
			compareOp:      string(ruletypes.ValueIsAbove),
			matchType:      string(ruletypes.AtleastOnce),
			target:         target,
			recoveryTarget: &recovery,
			thresholdName:  "primary",
			// Since sendUnmatched is true, the rule should return the first valid point
			// even if it doesn't match the rule condition with current target value of 10.0
			sendUnmatched:       true,
			expectSamples:       intPtr(1),
			expectedSampleValue: 7,
		},
	}

	for _, tc := range tests {
		runEvalTests(t, postableRule, []recoveryTestCase{tc})
	}
}

// TestThresholdRuleEval_RecoveryNotMetSendUnmatchedFalse tests the case where the recovery target is not met and sendUnmatched is false.
// In this case, the rule should not return any samples as no alert is active plus the recovery target is not met.
func TestThresholdRuleEval_RecoveryNotMetSendUnmatchedFalse(t *testing.T) {
	target := 10.0
	recovery := 5.0

	now := time.Now()
	postableRule := ruletypes.PostableRule{
		AlertName: "Recovery not met sendUnmatched false",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	tc := recoveryTestCase{
		description: "recovery target present but not met, sendUnmatched false",
		values: qbtypes.TimeSeries{
			Values: []*qbtypes.TimeSeriesValue{
				{Timestamp: now.UnixMilli(), Value: 3},
				{Timestamp: now.Add(time.Minute).UnixMilli(), Value: 4},
			},
			Labels: []*qbtypes.Label{
				{Key: telemetrytypes.TelemetryFieldKey{Name: "service.name"}, Value: "frontend"},
			},
		},
		compareOp:              string(ruletypes.ValueIsAbove),
		matchType:              string(ruletypes.AtleastOnce),
		target:                 target,
		recoveryTarget:         &recovery,
		thresholdName:          "primary",
		sendUnmatched:          false,
		expectSamples:          intPtr(0),
		activeAlerts:           nil, // will auto-calc
		expectedTarget:         target,
		expectedRecoveryTarget: recovery,
	}

	runEvalTests(t, postableRule, []recoveryTestCase{tc})
}

func runEvalTests(t *testing.T, postableRule ruletypes.PostableRule, testCases []recoveryTestCase) {
	logger := instrumentationtest.New().Logger()
	for _, c := range testCases {
		t.Run(c.description, func(t *testing.T) {
			// Prepare threshold with recovery target
			threshold := ruletypes.BasicRuleThreshold{
				Name:           c.thresholdName,
				TargetValue:    &c.target,
				RecoveryTarget: c.recoveryTarget,
				MatchType:      ruletypes.MatchType(c.matchType),
				CompareOp:      ruletypes.CompareOp(c.compareOp),
			}

			// Build thresholds list
			thresholds := ruletypes.BasicRuleThresholds{threshold}

			// Add additional thresholds if specified
			for _, addThreshold := range c.additionalThresholds {
				thresholds = append(thresholds, ruletypes.BasicRuleThreshold{
					Name:           addThreshold.name,
					TargetValue:    &addThreshold.target,
					RecoveryTarget: addThreshold.recoveryTarget,
					MatchType:      ruletypes.MatchType(addThreshold.matchType),
					CompareOp:      ruletypes.CompareOp(addThreshold.compareOp),
				})
			}

			postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: thresholds,
			}

			rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(valuer.MustParseTextDuration("2m")))
			if err != nil {
				assert.NoError(t, err)
				return
			}

			values := c.values
			for i := range values.Values {
				values.Values[i].Timestamp = time.Now().UnixMilli()
			}

			// Prepare activeAlerts: if nil, auto-calculate from labels + thresholdName
			activeAlerts := c.activeAlerts
			labelsMap := values.LabelsMap()
			if activeAlerts == nil {
				sampleLabels := ruletypes.PrepareSampleLabelsForRule(labelsMap, c.thresholdName)
				alertHash := sampleLabels.Hash()
				activeAlerts = map[uint64]struct{}{alertHash: {}}
				// Handle other thresholds
				for _, addThreshold := range c.additionalThresholds {
					sampleLabels := ruletypes.PrepareSampleLabelsForRule(labelsMap, addThreshold.name)
					alertHash := sampleLabels.Hash()
					activeAlerts[alertHash] = struct{}{}
				}
			}

			evalData := ruletypes.EvalData{
				ActiveAlerts:  activeAlerts,
				SendUnmatched: c.sendUnmatched,
			}

			resultVectors, err := rule.Threshold.Eval(values, rule.Unit(), evalData)
			assert.NoError(t, err)

			if c.expectSamples != nil {
				assert.Equal(t, *c.expectSamples, len(resultVectors), "sample count mismatch")
				if *c.expectSamples > 0 {
					assert.InDelta(t, c.expectedSampleValue, resultVectors[0].V, 0.01, "sample value mismatch")
				}
				return
			}

			// Verify results
			if c.expectAlert || c.expectRecovery {
				// Either a new alert fires or recovery happens - both return result vectors
				assert.NotEmpty(t, resultVectors, "Expected alert or recovery but got no result vectors")
				if len(resultVectors) > 0 {
					found := false
					for _, sample := range resultVectors {
						// Check if this is the expected sample
						if sample.V == c.expectedAlertSample {
							found = true
							// Verify IsRecovering flag
							assert.Equal(t, c.expectRecovery, sample.IsRecovering, "IsRecovering flag mismatch")
							// Verify target value
							if c.expectedTarget != 0 || sample.Target != 0 {
								assert.InDelta(t, c.expectedTarget, sample.Target, 0.01, "Target value mismatch")
							}
							if sample.RecoveryTarget != nil {
								assert.InDelta(t, *sample.RecoveryTarget, c.expectedRecoveryTarget, 0.01, "Recovery target value mismatch")
							}
							break
						}
					}
					assert.True(t, found, "Expected alert sample value %.2f not found in result vectors. Got values: %v", c.expectedAlertSample, getVectorValues(resultVectors))
				}
			} else {
				// No alert and no recovery expected - should be empty
				assert.Empty(t, resultVectors, "Expected no alert but got result vectors: %v", resultVectors)
			}
		})
	}
}

// runMultiThresholdEvalTests runs tests for multiple threshold scenarios
// where each threshold can be in a different state (firing, recovering, resolved)
func runMultiThresholdEvalTests(t *testing.T, postableRule ruletypes.PostableRule, testCases []multiThresholdTestCase) {
	logger := instrumentationtest.New().Logger()
	for _, c := range testCases {
		t.Run(c.description, func(t *testing.T) {
			// Prepare primary threshold
			threshold := ruletypes.BasicRuleThreshold{
				Name:           c.thresholdName,
				TargetValue:    &c.target,
				RecoveryTarget: c.recoveryTarget,
				MatchType:      ruletypes.MatchType(c.matchType),
				CompareOp:      ruletypes.CompareOp(c.compareOp),
			}

			// Build thresholds list
			thresholds := ruletypes.BasicRuleThresholds{threshold}

			// Add additional thresholds
			for _, addThreshold := range c.additionalThresholds {
				thresholds = append(thresholds, ruletypes.BasicRuleThreshold{
					Name:           addThreshold.name,
					TargetValue:    &addThreshold.target,
					RecoveryTarget: addThreshold.recoveryTarget,
					MatchType:      ruletypes.MatchType(addThreshold.matchType),
					CompareOp:      ruletypes.CompareOp(addThreshold.compareOp),
				})
			}

			postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: thresholds,
			}

			rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(valuer.MustParseTextDuration("2m")))
			if err != nil {
				assert.NoError(t, err)
				return
			}

			values := c.values
			for i := range values.Values {
				values.Values[i].Timestamp = time.Now().UnixMilli()
			}

			// Prepare activeAlerts: if nil, auto-calculate from labels + all threshold names
			activeAlerts := c.activeAlerts
			labelsMap := values.LabelsMap()
			if activeAlerts == nil {
				activeAlerts = make(map[uint64]struct{})
				// Add primary threshold
				sampleLabels := ruletypes.PrepareSampleLabelsForRule(labelsMap, c.thresholdName)
				alertHash := sampleLabels.Hash()
				activeAlerts[alertHash] = struct{}{}
				// Add additional thresholds
				for _, addThreshold := range c.additionalThresholds {
					sampleLabels := ruletypes.PrepareSampleLabelsForRule(labelsMap, addThreshold.name)
					alertHash := sampleLabels.Hash()
					activeAlerts[alertHash] = struct{}{}
				}
			}

			evalData := ruletypes.EvalData{
				ActiveAlerts: activeAlerts,
			}

			resultVectors, err := rule.Threshold.Eval(values, rule.Unit(), evalData)
			assert.NoError(t, err)

			// Validate total sample count
			assert.Equal(t, c.ExpectedSampleCount, len(resultVectors),
				"Expected %d samples but got %d. Sample values: %v",
				c.ExpectedSampleCount, len(resultVectors), getVectorValues(resultVectors))

			// Build a map of threshold name -> sample for easy lookup
			samplesByThreshold := make(map[string]ruletypes.Sample)
			for _, sample := range resultVectors {
				thresholdName := sample.Metric.Get(ruletypes.LabelThresholdName)
				samplesByThreshold[thresholdName] = sample
			}

			// Validate each threshold's expected result
			for thresholdName, expectation := range c.ExpectedResults {
				sample, found := samplesByThreshold[thresholdName]

				if expectation.ShouldReturnSample {
					assert.True(t, found, "Expected sample for threshold '%s' but not found in results", thresholdName)
					if !found {
						continue
					}

					// Validate IsRecovering flag
					assert.Equal(t, expectation.IsRecovering, sample.IsRecovering,
						"Threshold '%s': IsRecovering flag mismatch", thresholdName)

					// Validate sample value
					assert.InDelta(t, expectation.SampleValue, sample.V, 0.01,
						"Threshold '%s': Sample value mismatch", thresholdName)

					// Validate target value
					assert.InDelta(t, expectation.TargetValue, sample.Target, 0.01,
						"Threshold '%s': Target value mismatch", thresholdName)

					// Validate recovery target value
					if expectation.RecoveryValue != nil {
						assert.NotNil(t, sample.RecoveryTarget,
							"Threshold '%s': Expected RecoveryTarget to be set but it was nil", thresholdName)
						if sample.RecoveryTarget != nil {
							assert.InDelta(t, *expectation.RecoveryValue, *sample.RecoveryTarget, 0.01,
								"Threshold '%s': RecoveryTarget value mismatch", thresholdName)
						}
					}
				} else {
					assert.False(t, found, "Expected NO sample for threshold '%s' but found one with value %.2f",
						thresholdName, sample.V)
				}
			}

			// Validate sample order if specified
			if len(c.ExpectedSampleOrder) > 0 {
				assert.Equal(t, len(c.ExpectedSampleOrder), len(resultVectors),
					"Expected sample order length mismatch")
				for i, expectedName := range c.ExpectedSampleOrder {
					if i < len(resultVectors) {
						actualName := resultVectors[i].Metric.Get(ruletypes.LabelThresholdName)
						assert.Equal(t, expectedName, actualName,
							"Sample order mismatch at index %d: expected '%s', got '%s'",
							i, expectedName, actualName)
					}
				}
			}
		})
	}
}

// TestThresholdRuleEval_MultiThreshold tests multiple threshold scenarios
// where each threshold can be in a different state (firing, recovering, resolved)
func TestThresholdRuleEval_MultiThreshold(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Multi-Threshold Recovery Test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "probe_success",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceMetrics,
						Expression:        "A",
					},
				},
			},
		},
	}

	runMultiThresholdEvalTests(t, postableRule, tcThresholdRuleEvalMultiThreshold)
}

func TestThresholdEval_RequireMinPoints(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Unit test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: valuer.MustParseTextDuration("5m"),
			Frequency:  valuer.MustParseTextDuration("1m"),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompareOp: ruletypes.ValueIsAbove,
			MatchType: ruletypes.AtleastOnce,
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:          "A",
						StepInterval:       60,
						AggregateAttribute: v3.AttributeKey{Key: "signoz_calls_total"},
						AggregateOperator:  v3.AggregateOperatorSumRate,
						SpaceAggregation:   v3.SpaceAggregationSum,
						TimeAggregation:    v3.TimeAggregationRate,
						DataSource:         v3.DataSourceMetrics,
						Expression:         "A",
					},
				},
			},
		},
	}

	cases := []struct {
		description       string
		requireMinPoints  bool
		requiredNumPoints int
		values            [][]any
		target            float64
		expectAlerts      int
	}{
		{
			description:      "AlertCondition=false, RequireMinPoints=false",
			requireMinPoints: false,
			values: [][]any{
				{100.0, "attr", time.Now()},
				{150.0, "attr", time.Now().Add(-1 * time.Minute)},
			},
			target:       200,
			expectAlerts: 0,
		},
		{
			description:      "AlertCondition=true, RequireMinPoints=false",
			requireMinPoints: false,
			values: [][]any{
				{100.0, "attr", time.Now()},
				{150.0, "attr", time.Now().Add(-1 * time.Minute)},
				{250.0, "attr", time.Now().Add(-2 * time.Minute)},
			},
			target:       200,
			expectAlerts: 1,
		},
		{
			description:       "AlertCondition=true, RequireMinPoints=true, NumPoints=more_than_required",
			requireMinPoints:  true,
			requiredNumPoints: 2,
			values: [][]any{
				{100.0, "attr", time.Now()},
				{150.0, "attr", time.Now().Add(-1 * time.Minute)},
				{250.0, "attr", time.Now().Add(-2 * time.Minute)},
			},
			target:       200,
			expectAlerts: 1,
		},
		{
			description:       "AlertCondition=true, RequireMinPoints=true, NumPoints=same_as_required",
			requireMinPoints:  true,
			requiredNumPoints: 3,
			values: [][]any{
				{100.0, "attr", time.Now()},
				{150.0, "attr", time.Now().Add(-1 * time.Minute)},
				{250.0, "attr", time.Now().Add(-2 * time.Minute)},
			},
			target:       200,
			expectAlerts: 1,
		},
		{
			description:       "AlertCondition=true, RequireMinPoints=true, NumPoints=insufficient",
			requireMinPoints:  true,
			requiredNumPoints: 4,
			values: [][]any{
				{100.0, "attr", time.Now()},
				{150.0, "attr", time.Now().Add(-1 * time.Minute)},
				{250.0, "attr", time.Now().Add(-2 * time.Minute)},
			},
			target:       200,
			expectAlerts: 0,
		},
		{
			description:       "AlertCondition=true, RequireMinPoints=true, NumPoints=zero",
			requireMinPoints:  true,
			requiredNumPoints: 4,
			values:            [][]any{},
			target:            200,
			expectAlerts:      0,
		},
	}

	for idx, c := range cases {
		logger := instrumentationtest.New().Logger()
		mock := newMockQuerierV5ForRows("A", c.values)

		rc := postableRule.RuleCondition
		rc.Target = &c.target
		rc.RequireMinPoints = c.requireMinPoints
		rc.RequiredNumPoints = c.requiredNumPoints
		rc.Thresholds = &ruletypes.RuleThresholdData{
			Kind: ruletypes.BasicThresholdKind,
			Spec: ruletypes.BasicRuleThresholds{
				{
					Name:        postableRule.AlertName,
					TargetValue: &c.target,
					MatchType:   rc.MatchType,
					CompareOp:   rc.CompareOp,
				},
			},
		}

		rule, err := NewThresholdRule("some-id", valuer.GenerateUUID(), &postableRule, newTestReader(), mock, logger)
		t.Run(fmt.Sprintf("%d %s", idx, c.description), func(t *testing.T) {
			require.NoError(t, err)
			rule.TemporalityMap = map[string]map[v3.Temporality]bool{
				"signoz_calls_total": {v3.Delta: true},
			}

			alertsFound, err := rule.Eval(context.Background(), time.Now())
			require.NoError(t, err)

			assert.Equal(t, c.expectAlerts, alertsFound, "case %d", idx)
		})
	}
}
