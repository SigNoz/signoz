package rules

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestCalculateEvalDelay(t *testing.T) {
	defaultDelay := 2 * time.Minute
	targetValue := 1.0

	tests := []struct {
		name          string
		rule          *ruletypes.PostableRule
		expectedDelay time.Duration
	}{
		{
			name: "Safe: Min + AtleastOnce + Below",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsBelow,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationMin},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsBelow,
							},
						},
					},
				},
			},
			expectedDelay: 0,
		},
		{
			name: "Safe: Max + AllTheTimes + AboveOrEq",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AllTheTimes,
					CompareOp: ruletypes.ValueAboveOrEq,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationMax},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AllTheTimes,
								CompareOp:   ruletypes.ValueAboveOrEq,
							},
						},
					},
				},
			},
			expectedDelay: 0,
		},
		{
			name: "Safe: Count + AtleastOnce + Above",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationCount},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: 0,
		},
		{
			name: "Unsafe: Min + AtleastOnce + Above (Min can decrease)",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationMin},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Sum (Value can go up or down)",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationSum},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Avg",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationAvg},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Mixed Safe and Unsafe Queries",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationMax}, // Safe
									},
								},
							},
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationSum}, // Unsafe
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Non-Metric Query (Logs)",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
									Aggregations: []qbtypes.LogAggregation{
										{Expression: "count"},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Empty Queries",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Null Rule Condition",
			rule: &ruletypes.PostableRule{
				RuleCondition: nil,
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Safe TimeAgg but Aggregations list empty",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Rate",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationRate},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Safe: Min + AtleastOnce + BelowOrEq",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueBelowOrEq,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationMin},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueBelowOrEq,
							},
						},
					},
				},
			},
			expectedDelay: 0,
		},
		{
			name: "Unsafe: Min + AtleastOnce + OutsideBounds",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueOutsideBounds,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationMin},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueOutsideBounds,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Safe: TimeAgg value is 'min' (string value check)",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsBelow,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregation{valuer.NewString("min")}},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsBelow,
							},
						},
					},
				},
			},
			expectedDelay: 0,
		},
		{
			name: "Unsafe: PromQL query only",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypePromQL,
								Spec: qbtypes.PromQuery{
									Name:     "prom_query",
									Query:    "rate(cpu_usage_total[5m])",
									Disabled: false,
									Step:     qbtypes.Step{Duration: 60 * time.Second},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Legacy ClickHouseQueries field (not supported)",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						QueryType: v3.QueryTypeClickHouseSQL,
						ClickHouseQueries: map[string]*v3.ClickHouseQuery{
							"A": {
								Query:    "SELECT count(*) FROM metrics WHERE timestamp >= ? AND timestamp <= ?",
								Disabled: false,
							},
						},
						Queries: []qbtypes.QueryEnvelope{}, // Empty Queries array
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:        "test-threshold",
								TargetValue: &targetValue,
								MatchType:   ruletypes.AtleastOnce,
								CompareOp:   ruletypes.ValueIsAbove,
							},
						},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Missing Thresholds",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationMax},
									},
								},
							},
						},
					},
					Thresholds: nil,
				},
			},
			expectedDelay: defaultDelay,
		},
		{
			name: "Unsafe: Empty Thresholds",
			rule: &ruletypes.PostableRule{
				RuleCondition: &ruletypes.RuleCondition{
					MatchType: ruletypes.AtleastOnce,
					CompareOp: ruletypes.ValueIsAbove,
					CompositeQuery: &v3.CompositeQuery{
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Aggregations: []qbtypes.MetricAggregation{
										{TimeAggregation: metrictypes.TimeAggregationMax},
									},
								},
							},
						},
					},
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{},
					},
				},
			},
			expectedDelay: defaultDelay,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			delay := CalculateEvalDelay(tt.rule, defaultDelay)
			assert.Equal(t, tt.expectedDelay, delay)
		})
	}
}
