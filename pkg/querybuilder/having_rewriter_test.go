package querybuilder

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRewriteForLogs(t *testing.T) {
	tests := []struct {
		name           string
		expression     string
		aggregations   []qbtypes.LogAggregation
		wantExpression string
		wantErr        bool
		wantErrMsg     string
	}{
		{
			name:       "alias reference",
			expression: "total_logs > 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantExpression: "__result_0 > 1000",
		},
		{
			name:       "expression reference (function call)",
			expression: "sum(bytes) > 1024000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(bytes)"},
			},
			wantExpression: "__result_0 > 1024000",
		},
		{
			name:       "__result reference for single aggregation",
			expression: "__result > 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantExpression: "__result_0 > 500",
		},
		{
			name:       "__result0 indexed reference",
			expression: "__result0 > 100 AND __result1 < 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
				{Expression: "sum(bytes)"},
			},
			wantExpression: "__result_0 > 100 AND __result_1 < 1000",
		},
		{
			name:       "__result_0 underscore indexed reference",
			expression: "__result_0 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantExpression: "__result_0 > 100",
		},
		{
			name:       "complex boolean with parentheses",
			expression: "(total > 100 AND avg_duration < 500) OR total > 10000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
				{Expression: "avg(duration)", Alias: "avg_duration"},
			},
			wantExpression: "(__result_0 > 100 AND __result_1 < 500) OR __result_0 > 10000",
		},
		{
			name:       "mixed alias and expression reference",
			expression: "error_count > 10 AND count() < 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
				{Expression: "countIf(level='error')", Alias: "error_count"},
			},
			wantExpression: "__result_1 > 10 AND __result_0 < 1000",
		},
		{
			name:       "NOT on grouped expression",
			expression: "NOT (__result_0 > 100 AND __result_1 < 500)",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
				{Expression: "sum(bytes)"},
			},
			wantExpression: "NOT (__result_0 > 100 AND __result_1 < 500)",
		},
		{
			name:       "arithmetic on aggregations",
			expression: "sum_a + sum_b > 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(a)", Alias: "sum_a"},
				{Expression: "sum(b)", Alias: "sum_b"},
			},
			wantExpression: "__result_0 + __result_1 > 1000",
		},
		{
			name:       "numeric literal as threshold value",
			expression: "total > 0",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 > 0",
		},
		{
			name:       "string literal as comparison value",
			expression: "sum(bytes) = 'xyz'",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(bytes)"},
			},
			wantErr:    true,
			wantErrMsg: "HAVING expression cannot contain string literals",
		},
		{
			name:       "double-quoted string literal",
			expression: `total > "threshold"`,
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:    true,
			wantErrMsg: "HAVING expression cannot contain string literals",
		},
		{
			name:       "unknown identifier",
			expression: "unknown_alias > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [unknown_alias]",
		},
		{
			name:       "expression not in column map",
			expression: "sum(missing_field) > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [sum, missing_field]",
		},
		{
			name:       "one valid one invalid reference",
			expression: "total > 100 AND ghost > 50",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [ghost]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := NewHavingExpressionRewriter()
			got, err := r.RewriteForLogs(tt.expression, tt.aggregations)
			if tt.wantErr {
				require.Error(t, err)
				assert.ErrorContains(t, err, tt.wantErrMsg)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantExpression, got)
			}
		})
	}
}

func TestRewriteForTraces(t *testing.T) {
	tests := []struct {
		name           string
		expression     string
		aggregations   []qbtypes.TraceAggregation
		wantExpression string
		wantErr        bool
		wantErrMsg     string
	}{
		{
			name:       "alias reference",
			expression: "p99_latency > 500",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "p99(duration_nano)", Alias: "p99_latency"},
			},
			wantExpression: "__result_0 > 500",
		},
		{
			name:       "expression reference",
			expression: "count() > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()"},
			},
			wantExpression: "__result_0 > 100",
		},
		{
			name:       "__result reference for single aggregation",
			expression: "__result >= 1000",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "sum(duration_nano)"},
			},
			wantExpression: "__result_0 >= 1000",
		},
		{
			name:       "multiple aggregations with boolean logic",
			expression: "span_count > 10 AND avg_duration < 5000",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: "span_count"},
				{Expression: "avg(duration_nano)", Alias: "avg_duration"},
			},
			wantExpression: "__result_0 > 10 AND __result_1 < 5000",
		},
		{
			name:       "string literal rejected",
			expression: "count() = 'high'",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "HAVING expression cannot contain string literals",
		},
		{
			name:       "unknown reference",
			expression: "typo_alias > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: "span_count"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [typo_alias]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := NewHavingExpressionRewriter()
			got, err := r.RewriteForTraces(tt.expression, tt.aggregations)
			if tt.wantErr {
				require.Error(t, err)
				assert.ErrorContains(t, err, tt.wantErrMsg)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantExpression, got)
			}
		})
	}
}

func TestRewriteForMetrics(t *testing.T) {
	tests := []struct {
		name           string
		expression     string
		aggregations   []qbtypes.MetricAggregation
		wantExpression string
		wantErr        bool
		wantErrMsg     string
	}{
		{
			name:       "time aggregation reference",
			expression: "sum(cpu_usage) > 80",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantExpression: "value > 80",
		},
		{
			name:       "space aggregation reference",
			expression: "avg(cpu_usage) > 50",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					SpaceAggregation: metrictypes.SpaceAggregationAvg,
					TimeAggregation:  metrictypes.TimeAggregationUnspecified,
				},
			},
			wantExpression: "value > 50",
		},
		{
			name:       "combined space and time aggregation via __result reference",
			expression: "__result > 70",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationAvg,
					SpaceAggregation: metrictypes.SpaceAggregationSum,
				},
			},
			wantExpression: "value > 70",
		},
		{
			name:       "__result reference",
			expression: "__result > 90",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantExpression: "value > 90",
		},
		{
			name:       "bare metric name when no aggregations set",
			expression: "cpu_usage > 80",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationUnspecified,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantExpression: "value > 80",
		},
		{
			name:       "unknown metric reference",
			expression: "wrong_metric > 80",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [wrong_metric]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := NewHavingExpressionRewriter()
			got, err := r.RewriteForMetrics(tt.expression, tt.aggregations)
			if tt.wantErr {
				require.Error(t, err)
				assert.ErrorContains(t, err, tt.wantErrMsg)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantExpression, got)
			}
		})
	}
}
