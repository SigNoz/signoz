package rules

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/cache/cachetest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/prometheustest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	cmock "github.com/srikanthccv/ClickHouse-go-mock"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func TestThresholdRuleEvalBackwardCompat(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Eval Backward Compatibility Test without recovery target",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
		if err != nil {
			assert.NoError(t, err)
		}

		values := c.values
		for i := range values.Points {
			values.Points[i].Timestamp = time.Now().UnixMilli()
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
					if sample.V == c.expectedAlertSample.Value {
						found = true
						break
					}
				}
				assert.True(t, found, "Expected alert sample value %.2f not found in result vectors for case %d. Got values: %v", c.expectedAlertSample.Value, idx, getVectorValues(resultVectors))
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

func TestPrepareLinksToLogs(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Tricky Condition Tests",
		AlertType: ruletypes.AlertTypeLogs,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeBuilder,
				BuilderQueries: map[string]*v3.BuilderQuery{
					"A": {
						QueryName:    "A",
						StepInterval: 60,
						AggregateAttribute: v3.AttributeKey{
							Key: "",
						},
						AggregateOperator: v3.AggregateOperatorNoOp,
						DataSource:        v3.DataSourceLogs,
						Expression:        "A",
					},
				},
			},
			CompareOp:     "4", // Not Equals
			MatchType:     "1", // Once
			Target:        &[]float64{0.0}[0],
			SelectedQuery: "A",
		},
	}

	logger := instrumentationtest.New().Logger()
	postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
		Kind: ruletypes.BasicThresholdKind,
		Spec: ruletypes.BasicRuleThresholds{
			{
				TargetValue: postableRule.RuleCondition.Target,
				MatchType:   ruletypes.MatchType(postableRule.RuleCondition.MatchType),
				CompareOp:   ruletypes.CompareOp(postableRule.RuleCondition.CompareOp),
			},
		},
	}
	rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
	if err != nil {
		assert.NoError(t, err)
	}

	ts := time.UnixMilli(1705469040000)

	link := rule.prepareLinksToLogs(context.Background(), ts, labels.Labels{})
	assert.Contains(t, link, "&timeRange=%7B%22start%22%3A1705468620000%2C%22end%22%3A1705468920000%2C%22pageSize%22%3A100%7D&startTime=1705468620000&endTime=1705468920000")
}

func TestPrepareLinksToLogsV5(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Tricky Condition Tests",
		AlertType: ruletypes.AlertTypeLogs,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
				MatchType:   ruletypes.MatchType(postableRule.RuleCondition.MatchType),
				CompareOp:   ruletypes.CompareOp(postableRule.RuleCondition.CompareOp),
			},
		},
	}
	rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
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
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
				MatchType:   ruletypes.MatchType(postableRule.RuleCondition.MatchType),
				CompareOp:   ruletypes.CompareOp(postableRule.RuleCondition.CompareOp),
			},
		},
	}
	rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
	if err != nil {
		assert.NoError(t, err)
	}

	ts := time.UnixMilli(1753527163000)

	link := rule.prepareLinksToTraces(context.Background(), ts, labels.Labels{})
	assert.Contains(t, link, "compositeQuery=%257B%2522queryType%2522%253A%2522builder%2522%252C%2522builder%2522%253A%257B%2522queryData%2522%253A%255B%257B%2522queryName%2522%253A%2522A%2522%252C%2522stepInterval%2522%253A60%252C%2522dataSource%2522%253A%2522traces%2522%252C%2522aggregateOperator%2522%253A%2522noop%2522%252C%2522aggregateAttribute%2522%253A%257B%2522key%2522%253A%2522%2522%252C%2522dataType%2522%253A%2522%2522%252C%2522type%2522%253A%2522%2522%252C%2522isColumn%2522%253Afalse%252C%2522isJSON%2522%253Afalse%257D%252C%2522expression%2522%253A%2522A%2522%252C%2522disabled%2522%253Afalse%252C%2522limit%2522%253A0%252C%2522offset%2522%253A0%252C%2522pageSize%2522%253A0%252C%2522ShiftBy%2522%253A0%252C%2522IsAnomaly%2522%253Afalse%252C%2522QueriesUsedInFormula%2522%253Anull%252C%2522filter%2522%253A%257B%2522expression%2522%253A%2522service.name%2BEXISTS%2522%257D%257D%255D%252C%2522queryFormulas%2522%253A%255B%255D%257D%257D&timeRange=%7B%22start%22%3A1753526700000000000%2C%22end%22%3A1753527000000000000%2C%22pageSize%22%3A100%7D&startTime=1753526700000000000&endTime=1753527000000000000&options=%7B%22maxLines%22%3A0%2C%22format%22%3A%22%22%2C%22selectColumns%22%3Anull%7D")
}

func TestPrepareLinksToTraces(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Links to traces test",
		AlertType: ruletypes.AlertTypeTraces,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
						AggregateOperator: v3.AggregateOperatorAvg,
						DataSource:        v3.DataSourceTraces,
						Expression:        "A",
					},
				},
			},
			CompareOp:     "4", // Not Equals
			MatchType:     "1", // Once
			Target:        &[]float64{0.0}[0],
			SelectedQuery: "A",
		},
	}

	logger := instrumentationtest.New().Logger()
	postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
		Kind: ruletypes.BasicThresholdKind,
		Spec: ruletypes.BasicRuleThresholds{
			{
				TargetValue: postableRule.RuleCondition.Target,
				MatchType:   ruletypes.MatchType(postableRule.RuleCondition.MatchType),
				CompareOp:   ruletypes.CompareOp(postableRule.RuleCondition.CompareOp),
			},
		},
	}
	rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
	if err != nil {
		assert.NoError(t, err)
	}

	ts := time.UnixMilli(1705469040000)

	link := rule.prepareLinksToTraces(context.Background(), ts, labels.Labels{})
	assert.Contains(t, link, "&timeRange=%7B%22start%22%3A1705468620000000000%2C%22end%22%3A1705468920000000000%2C%22pageSize%22%3A100%7D&startTime=1705468620000000000&endTime=1705468920000000000")
}

func TestThresholdRuleLabelNormalization(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Tricky Condition Tests",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
		values      v3.Series
		expectAlert bool
		compareOp   string
		matchType   string
		target      float64
	}{
		// Test cases for Equals Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
				Labels: map[string]string{
					"service.name": "frontend",
				},
				LabelsArray: []map[string]string{
					{
						"service.name": "frontend",
					},
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

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
		if err != nil {
			assert.NoError(t, err)
		}

		values := c.values
		for i := range values.Points {
			values.Points[i].Timestamp = time.Now().UnixMilli()
		}

		vector, err := rule.Threshold.Eval(c.values, rule.Unit(), ruletypes.EvalData{})
		assert.NoError(t, err)

		for name, value := range c.values.Labels {
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

func TestThresholdRuleEvalDelay(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Test Eval Delay",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"A": {
						Query: "SELECT 1 >= {{.start_timestamp_ms}} AND 1 <= {{.end_timestamp_ms}}",
					},
				},
			},
		},
	}
	postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
		Kind: ruletypes.BasicThresholdKind,
		Spec: ruletypes.BasicRuleThresholds{
			{
				TargetValue: postableRule.RuleCondition.Target,
				MatchType:   ruletypes.MatchType(postableRule.RuleCondition.MatchType),
				CompareOp:   ruletypes.CompareOp(postableRule.RuleCondition.CompareOp),
			},
		},
	}

	// 01:39:47
	ts := time.Unix(1717205987, 0)

	cases := []struct {
		expectedQuery string
	}{
		// Test cases for Equals Always
		{
			// 01:34:00 - 01:39:00
			expectedQuery: "SELECT 1 >= 1717205640000 AND 1 <= 1717205940000",
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger) // no eval delay
		if err != nil {
			assert.NoError(t, err)
		}

		params, err := rule.prepareQueryRange(context.Background(), ts)
		assert.NoError(t, err)
		assert.Equal(t, c.expectedQuery, params.CompositeQuery.ClickHouseQueries["A"].Query, "Test case %d", idx)

		secondTimeParams, err := rule.prepareQueryRange(context.Background(), ts)
		assert.NoError(t, err)
		assert.Equal(t, c.expectedQuery, secondTimeParams.CompositeQuery.ClickHouseQueries["A"].Query, "Test case %d", idx)
	}
}

func TestThresholdRuleClickHouseTmpl(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Tricky Condition Tests",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &v3.CompositeQuery{
				QueryType: v3.QueryTypeClickHouseSQL,
				ClickHouseQueries: map[string]*v3.ClickHouseQuery{
					"A": {
						Query: "SELECT 1 >= {{.start_timestamp_ms}} AND 1 <= {{.end_timestamp_ms}}",
					},
				},
			},
		},
	}
	postableRule.RuleCondition.Thresholds = &ruletypes.RuleThresholdData{
		Kind: ruletypes.BasicThresholdKind,
		Spec: ruletypes.BasicRuleThresholds{
			{
				TargetValue: postableRule.RuleCondition.Target,
				MatchType:   ruletypes.MatchType(postableRule.RuleCondition.MatchType),
				CompareOp:   ruletypes.CompareOp(postableRule.RuleCondition.CompareOp),
			},
		},
	}

	// 01:39:47
	ts := time.Unix(1717205987, 0)

	cases := []struct {
		expectedQuery string
	}{
		// Test cases for Equals Always
		{
			// 01:32:00 - 01:37:00
			expectedQuery: "SELECT 1 >= 1717205520000 AND 1 <= 1717205820000",
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
		if err != nil {
			assert.NoError(t, err)
		}

		params, err := rule.prepareQueryRange(context.Background(), ts)
		assert.NoError(t, err)
		assert.Equal(t, c.expectedQuery, params.CompositeQuery.ClickHouseQueries["A"].Query, "Test case %d", idx)

		secondTimeParams, err := rule.prepareQueryRange(context.Background(), ts)
		assert.NoError(t, err)
		assert.Equal(t, c.expectedQuery, secondTimeParams.CompositeQuery.ClickHouseQueries["A"].Query, "Test case %d", idx)
	}
}

type queryMatcherAny struct {
}

func (m *queryMatcherAny) Match(x string, y string) error {
	return nil
}

func TestThresholdRuleUnitCombinations(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Units test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	cases := []struct {
		targetUnit   string
		yAxisUnit    string
		values       [][]interface{}
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
		rows := cmock.NewRows(cols, c.values)
		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		telemetryStore.Mock().
			ExpectQuery(queryString).
			WillReturnRows(rows)
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
		readerCache, err := cachetest.New(
			cache.Config{
				Provider: "memory",
				Memory: cache.Memory{
					NumCounters: 10 * 1000,
					MaxCost:     1 << 26,
				},
			},
		)
		require.NoError(t, err)
		reader := clickhouseReader.NewReader(nil, telemetryStore, prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}), "", time.Duration(time.Second), nil, readerCache, options)
		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, reader, nil, logger)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
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

func TestThresholdRuleNoData(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "No data test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	cases := []struct {
		values       [][]interface{}
		expectNoData bool
	}{
		{
			values:       [][]interface{}{},
			expectNoData: true,
		},
	}

	logger := instrumentationtest.New().Logger()

	for idx, c := range cases {
		rows := cmock.NewRows(cols, c.values)

		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		telemetryStore.Mock().
			ExpectQuery(queryString).
			WillReturnRows(rows)
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
		readerCache, err := cachetest.New(
			cache.Config{
				Provider: "memory",
				Memory: cache.Memory{
					NumCounters: 10 * 1000,
					MaxCost:     1 << 26,
				},
			},
		)
		assert.NoError(t, err)
		options := clickhouseReader.NewOptions("", "", "archiveNamespace")
		reader := clickhouseReader.NewReader(nil, telemetryStore, prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}), "", time.Duration(time.Second), nil, readerCache, options)

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, reader, nil, logger)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		assert.Equal(t, 1, retVal.(int), "case %d", idx)
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
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	metaCols := make([]cmock.ColumnType, 0)
	metaCols = append(metaCols, cmock.ColumnType{Name: "DISTINCT(tagKey)", Type: "String"})
	metaCols = append(metaCols, cmock.ColumnType{Name: "tagType", Type: "String"})
	metaCols = append(metaCols, cmock.ColumnType{Name: "dataType", Type: "String"})
	metaCols = append(metaCols, cmock.ColumnType{Name: "isColumn", Type: "Bool"})

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	logger := instrumentationtest.New().Logger()

	for idx, c := range testCases {
		metaRows := cmock.NewRows(metaCols, c.metaValues)
		telemetryStore.Mock().
			ExpectQuery("SELECT DISTINCT(tagKey), tagType, dataType FROM archiveNamespace.span_attributes_keys").
			WillReturnRows(metaRows)

		telemetryStore.Mock().
			ExpectSelect("SHOW CREATE TABLE signoz_traces.distributed_signoz_index_v3").WillReturnRows(&cmock.Rows{})

		rows := cmock.NewRows(cols, c.values)

		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		telemetryStore.Mock().
			ExpectQuery(queryString).
			WillReturnRows(rows)
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
		reader := clickhouseReader.NewReader(nil, telemetryStore, prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}), "", time.Duration(time.Second), nil, nil, options)

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, reader, nil, logger)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		if c.expectAlerts == 0 {
			assert.Equal(t, 0, retVal.(int), "case %d", idx)
		} else {
			assert.Equal(t, c.expectAlerts, retVal.(int), "case %d", idx)
			for _, item := range rule.Active {
				for name, value := range item.Annotations.Map() {
					if name == "related_traces" {
						assert.NotEmpty(t, value, "case %d", idx)
						assert.Contains(t, value, "GET")
					}
				}
			}
		}
	}
}

func TestThresholdRuleLogsLink(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Logs link test",
		AlertType: ruletypes.AlertTypeLogs,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	attrMetaCols := make([]cmock.ColumnType, 0)
	attrMetaCols = append(attrMetaCols, cmock.ColumnType{Name: "name", Type: "String"})
	attrMetaCols = append(attrMetaCols, cmock.ColumnType{Name: "datatype", Type: "String"})

	resourceMetaCols := make([]cmock.ColumnType, 0)
	resourceMetaCols = append(resourceMetaCols, cmock.ColumnType{Name: "name", Type: "String"})
	resourceMetaCols = append(resourceMetaCols, cmock.ColumnType{Name: "datatype", Type: "String"})

	createTableCols := make([]cmock.ColumnType, 0)
	createTableCols = append(createTableCols, cmock.ColumnType{Name: "statement", Type: "String"})

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	logger := instrumentationtest.New().Logger()

	for idx, c := range testCases {
		attrMetaRows := cmock.NewRows(attrMetaCols, c.attrMetaValues)
		telemetryStore.Mock().
			ExpectSelect("SELECT DISTINCT name, datatype from signoz_logs.distributed_logs_attribute_keys where name in ('component','k8s.container.name') group by name, datatype").
			WillReturnRows(attrMetaRows)

		resourceMetaRows := cmock.NewRows(resourceMetaCols, c.resourceMetaValues)
		telemetryStore.Mock().
			ExpectSelect("SELECT DISTINCT name, datatype from signoz_logs.distributed_logs_resource_keys where name in ('component','k8s.container.name') group by name, datatype").
			WillReturnRows(resourceMetaRows)

		createTableRows := cmock.NewRows(createTableCols, c.createTableValues)
		telemetryStore.Mock().
			ExpectSelect("SHOW CREATE TABLE signoz_logs.logs").
			WillReturnRows(createTableRows)

		rows := cmock.NewRows(cols, c.values)

		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		telemetryStore.Mock().
			ExpectQuery(queryString).
			WillReturnRows(rows)
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
		reader := clickhouseReader.NewReader(nil, telemetryStore, prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}), "", time.Duration(time.Second), nil, nil, options)

		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, reader, nil, logger)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
		}

		if c.expectAlerts == 0 {
			assert.Equal(t, 0, retVal.(int), "case %d", idx)
		} else {
			assert.Equal(t, c.expectAlerts, retVal.(int), "case %d", idx)
			for _, item := range rule.Active {
				for name, value := range item.Annotations.Map() {
					if name == "related_logs" {
						assert.NotEmpty(t, value, "case %d", idx)
						assert.Contains(t, value, "testcontainer")
					}
				}
			}
		}
	}
}

func TestThresholdRuleShiftBy(t *testing.T) {
	target := float64(10)
	postableRule := ruletypes.PostableRule{
		AlertName: "Logs link test",
		AlertType: ruletypes.AlertTypeLogs,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
		}},
		RuleCondition: &ruletypes.RuleCondition{
			Thresholds: &ruletypes.RuleThresholdData{
				Kind: ruletypes.BasicThresholdKind,
				Spec: ruletypes.BasicRuleThresholds{
					{
						TargetValue: &target,
						CompareOp:   ruletypes.ValueAboveOrEq,
						MatchType:   ruletypes.AtleastOnce,
					},
				},
			},
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
						Functions: []v3.Function{
							{
								Name: v3.FunctionNameTimeShift,
								Args: []interface{}{float64(10)},
							},
						},
					},
				},
			},
		},
	}

	logger := instrumentationtest.New().Logger()

	rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger)
	if err != nil {
		assert.NoError(t, err)
	}
	rule.TemporalityMap = map[string]map[v3.Temporality]bool{
		"signoz_calls_total": {
			v3.Delta: true,
		},
	}

	params, err := rule.prepareQueryRange(context.Background(), time.Now())
	if err != nil {
		assert.NoError(t, err)
	}

	assert.Equal(t, int64(10), params.CompositeQuery.BuilderQueries["A"].ShiftBy)
}

func TestMultipleThresholdRule(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Mulitple threshold test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{ruletypes.RollingEvaluation, ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
	telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})

	cols := make([]cmock.ColumnType, 0)
	cols = append(cols, cmock.ColumnType{Name: "value", Type: "Float64"})
	cols = append(cols, cmock.ColumnType{Name: "attr", Type: "String"})
	cols = append(cols, cmock.ColumnType{Name: "timestamp", Type: "String"})

	cases := []struct {
		targetUnit   string
		yAxisUnit    string
		values       [][]interface{}
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
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 572.58 ms
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 572.38 ms
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 300.94 ms
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 299.31 ms
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 ms
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
			values: [][]interface{}{
				{float64(2863284053), "attr", time.Now()},                             // 2.86 GB
				{float64(2863388842), "attr", time.Now().Add(1 * time.Second)},        // 2.86 GB
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 GB
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 GB
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 MB
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

	for idx, c := range cases {
		rows := cmock.NewRows(cols, c.values)
		// We are testing the eval logic after the query is run
		// so we don't care about the query string here
		queryString := "SELECT any"
		telemetryStore.Mock().
			ExpectQuery(queryString).
			WillReturnRows(rows)
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
		readerCache, err := cachetest.New(
			cache.Config{
				Provider: "memory",
				Memory: cache.Memory{
					NumCounters: 10 * 1000,
					MaxCost:     1 << 26,
				},
			},
		)
		require.NoError(t, err)
		reader := clickhouseReader.NewReader(nil, telemetryStore, prometheustest.New(instrumentationtest.New().Logger(), prometheus.Config{}), "", time.Duration(time.Second), nil, readerCache, options)
		rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, reader, nil, logger)
		rule.TemporalityMap = map[string]map[v3.Temporality]bool{
			"signoz_calls_total": {
				v3.Delta: true,
			},
		}
		if err != nil {
			assert.NoError(t, err)
		}

		retVal, err := rule.Eval(context.Background(), time.Now())
		if err != nil {
			assert.NoError(t, err)
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

func TestThresholdRuleEval_BasicCases(t *testing.T) {
	postableRule := ruletypes.PostableRule{
		AlertName: "Eval Recovery Threshold Test",
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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

			rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
			if err != nil {
				assert.NoError(t, err)
				return
			}

			values := c.values
			for i := range values.Points {
				values.Points[i].Timestamp = time.Now().UnixMilli()
			}

			// Prepare activeAlerts: if nil, auto-calculate from labels + thresholdName
			activeAlerts := c.activeAlerts
			if activeAlerts == nil {
				sampleLabels := ruletypes.PrepareSampleLabelsForRule(values.Labels, c.thresholdName)
				alertHash := sampleLabels.Hash()
				activeAlerts = map[uint64]struct{}{alertHash: {}}
				// Handle other thresholds
				for _, addThreshold := range c.additionalThresholds {
					sampleLabels := ruletypes.PrepareSampleLabelsForRule(values.Labels, addThreshold.name)
					alertHash := sampleLabels.Hash()
					activeAlerts[alertHash] = struct{}{}
				}
			}

			evalData := ruletypes.EvalData{
				ActiveAlerts: activeAlerts,
			}

			resultVectors, err := rule.Threshold.Eval(values, rule.Unit(), evalData)
			assert.NoError(t, err)

			// Verify results
			if c.expectAlert || c.expectRecovery {
				// Either a new alert fires or recovery happens - both return result vectors
				assert.NotEmpty(t, resultVectors, "Expected alert or recovery but got no result vectors")
				if len(resultVectors) > 0 {
					found := false
					for _, sample := range resultVectors {
						// Check if this is the expected sample
						if sample.V == c.expectedAlertSample.Value {
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
					assert.True(t, found, "Expected alert sample value %.2f not found in result vectors. Got values: %v", c.expectedAlertSample.Value, getVectorValues(resultVectors))
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

			rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, nil, nil, logger, WithEvalDelay(2*time.Minute))
			if err != nil {
				assert.NoError(t, err)
				return
			}

			values := c.values
			for i := range values.Points {
				values.Points[i].Timestamp = time.Now().UnixMilli()
			}

			// Prepare activeAlerts: if nil, auto-calculate from labels + all threshold names
			activeAlerts := c.activeAlerts
			if activeAlerts == nil {
				activeAlerts = make(map[uint64]struct{})
				// Add primary threshold
				sampleLabels := ruletypes.PrepareSampleLabelsForRule(values.Labels, c.thresholdName)
				alertHash := sampleLabels.Hash()
				activeAlerts[alertHash] = struct{}{}
				// Add additional thresholds
				for _, addThreshold := range c.additionalThresholds {
					sampleLabels := ruletypes.PrepareSampleLabelsForRule(values.Labels, addThreshold.name)
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
			EvalWindow: ruletypes.Duration(5 * time.Minute),
			Frequency:  ruletypes.Duration(1 * time.Minute),
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
