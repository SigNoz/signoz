package rules

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestPrepareQueryRangeWithFormulas(t *testing.T) {
	tests := []struct {
		name              string
		queries           []qbtypes.QueryEnvelope
		formulas          []qbtypes.QueryBuilderFormula
		expectedCount     int
		expectedTypes     []qbtypes.QueryType
		description       string
	}{
		{
			name: "only queries",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
			},
			formulas:      []qbtypes.QueryBuilderFormula{},
			expectedCount: 1,
			expectedTypes: []qbtypes.QueryType{qbtypes.QueryTypeBuilder},
			description:   "should include only queries when no formulas exist",
		},
		{
			name: "queries with enabled formulas",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   false,
				},
			},
			expectedCount: 2,
			expectedTypes: []qbtypes.QueryType{qbtypes.QueryTypeBuilder, qbtypes.QueryTypeFormula},
			description:   "should include both queries and enabled formulas in request",
		},
		{
			name: "queries with disabled formulas",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A * 2",
					Disabled:   true,
				},
			},
			expectedCount: 1,
			expectedTypes: []qbtypes.QueryType{qbtypes.QueryTypeBuilder},
			description:   "should not include disabled formulas in request",
		},
		{
			name: "multiple queries and mixed formulas",
			queries: []qbtypes.QueryEnvelope{
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "A",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
				{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:   "B",
						Signal: telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{
							{
								MetricName:       "test_metric_2",
								SpaceAggregation: metrictypes.SpaceAggregationSum,
								TimeAggregation:  metrictypes.TimeAggregationLatest,
							},
						},
						StepInterval: qbtypes.Step{Duration: time.Minute},
					},
				},
			},
			formulas: []qbtypes.QueryBuilderFormula{
				{
					Name:       "F1",
					Expression: "A + B",
					Disabled:   false,
				},
				{
					Name:       "F2",
					Expression: "A - B",
					Disabled:   true,
				},
				{
					Name:       "F3",
					Expression: "A / B",
					Disabled:   false,
				},
			},
			expectedCount: 4,
			expectedTypes: []qbtypes.QueryType{
				qbtypes.QueryTypeBuilder,
				qbtypes.QueryTypeBuilder,
				qbtypes.QueryTypeFormula,
				qbtypes.QueryTypeFormula,
			},
			description: "should include all enabled formulas with queries",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			postableRule := ruletypes.PostableRule{
				AlertName: "Test Alert",
				AlertType: ruletypes.AlertTypeMetric,
				RuleType:  ruletypes.RuleTypeThreshold,
				Version:   "v5",
				Evaluation: &ruletypes.EvaluationEnvelope{
					Kind: ruletypes.RollingEvaluation,
					Spec: ruletypes.RollingWindow{
						EvalWindow: valuer.MustParseTextDuration("5m"),
						Frequency:  valuer.MustParseTextDuration("1m"),
					},
				},
				RuleCondition: &ruletypes.RuleCondition{
					CompositeQuery: &ruletypes.AlertCompositeQuery{
						QueryType:     ruletypes.QueryTypeBuilder,
						Queries:       tt.queries,
						QueryFormulas: tt.formulas,
					},
					Target:          ptrFloat64(10.0),
					CompareOperator: ruletypes.ValueIsAbove,
					MatchType:       ruletypes.AllTheTimes,
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:            ruletypes.CriticalThresholdName,
								TargetValue:     ptrFloat64(10.0),
								CompareOperator: ruletypes.ValueIsAbove,
								MatchType:       ruletypes.AllTheTimes,
							},
						},
					},
				},
				SchemaVersion: ruletypes.DefaultSchemaVersion,
			}

			logger := instrumentationtest.New().Logger()
			rule, err := NewThresholdRule(
				"test-rule-id",
				valuer.GenerateUUID(),
				&postableRule,
				nil,
				logger,
				WithEvalDelay(valuer.MustParseTextDuration("2m")),
			)
			require.NoError(t, err)

			req, err := rule.prepareQueryRange(context.Background(), time.Now())
			require.NoError(t, err)

			assert.Equal(t, tt.expectedCount, len(req.CompositeQuery.Queries), tt.description)

			for i, expectedType := range tt.expectedTypes {
				assert.Equal(t, expectedType, req.CompositeQuery.Queries[i].Type)
			}
		})
	}
}

func ptrFloat64(v float64) *float64 {
	return &v
}
