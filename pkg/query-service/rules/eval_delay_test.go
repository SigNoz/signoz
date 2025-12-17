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
				},
			},
			expectedDelay: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			delay := CalculateEvalDelay(tt.rule, defaultDelay)
			assert.Equal(t, tt.expectedDelay, delay)
		})
	}
}
