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
			name:       "urinary expression alias",
			expression: "total_logs",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr: true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "urinary expression alias",
			expression: "count()",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr: true,
			wantErrMsg: "syntax error in HAVING expression",
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
		// logical correctness
		{
			name:       "bare operand without comparison",
			expression: "total_logs",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "unclosed parenthesis",
			expression: "(total_logs > 100 AND count() < 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "unexpected closing parenthesis",
			expression: "total_logs > 100)",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "dangling AND at end",
			expression: "total_logs > 100 AND",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "dangling OR at start",
			expression: "OR total_logs > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "consecutive boolean operators",
			expression: "total_logs > 100 AND AND count() < 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
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
			name:       "string literal without quotes as comparison value",
			expression: "sum(bytes) = xyz",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(bytes)"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [xyz]",
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
			wantErrMsg: "invalid references in HAVING expression: [missing_field, sum]",
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
		{
			name:       "reserved keyword as alias reference",
			expression: "sum > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "sum"},
			},
			wantExpression: "__result_0 > 100",
		},
		// operator variants
		{
			name:       "not-equals operator (!=)",
			expression: "total_logs != 0",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantExpression: "__result_0 != 0",
		},
		{
			name:       "alternate not-equals operator (<>)",
			expression: "count() <> 0",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantExpression: "__result_0 <> 0",
		},
		{
			name:       "double-equals operator (==)",
			expression: "total == 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 == 100",
		},
		// numeric literal variants
		{
			name:       "negative number threshold",
			expression: "count() > -10",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantExpression: "__result_0 > -10",
		},
		{
			name:       "float threshold",
			expression: "avg_latency > 500.5",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "avg(duration)", Alias: "avg_latency"},
			},
			wantExpression: "__result_0 > 500.5",
		},
		{
			name:       "scientific notation threshold",
			expression: "total > 1e6",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 > 1e6",
		},
		// boolean operator case variants
		{
			name:       "lowercase and",
			expression: "total > 100 and error_count < 10",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
				{Expression: "sum(errors)", Alias: "error_count"},
			},
			wantExpression: "__result_0 > 100 and __result_1 < 10",
		},
		{
			name:       "lowercase or",
			expression: "total < 10 or error_count > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
				{Expression: "sum(errors)", Alias: "error_count"},
			},
			wantExpression: "__result_0 < 10 or __result_1 > 100",
		},
		// arithmetic operand expressions
		{
			name:       "division arithmetic between aggregations",
			expression: "errors / total > 0.05",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(errors)", Alias: "errors"},
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 / __result_1 > 0.05",
		},
		{
			name:       "comparison between two aggregations",
			expression: "error_count > warn_count",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(errors)", Alias: "error_count"},
				{Expression: "sum(warnings)", Alias: "warn_count"},
			},
			wantExpression: "__result_0 > __result_1",
		},
		{
			name:       "multiplication of aggregation by constant",
			expression: "count() * 2 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantExpression: "__result_0 * 2 > 100",
		},
		{
			name:       "three-way AND with three aggregations",
			expression: "req_count > 10 AND avg_dur < 100 AND err_count != 0",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "req_count"},
				{Expression: "avg(duration)", Alias: "avg_dur"},
				{Expression: "sum(errors)", Alias: "err_count"},
			},
			wantExpression: "__result_0 > 10 AND __result_1 < 100 AND __result_2 != 0",
		},
		{
			name:       "arithmetic grouping with division",
			expression: "(sum_a + sum_b) / 2 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(a)", Alias: "sum_a"},
				{Expression: "sum(b)", Alias: "sum_b"},
			},
			wantExpression: "(__result_0 + __result_1) / 2 > 100",
		},
		// additional error cases
		{
			name:       "__result ambiguous with multiple aggregations",
			expression: "__result > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
				{Expression: "sum(bytes)"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [__result]",
		},
		{
			name:       "NOT without parentheses",
			expression: "NOT count() > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "empty expression",
			expression: "",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "two comparisons without boolean connector",
			expression: "total > 100 count() < 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "out-of-range __result_N index",
			expression: "__result_9 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [__result_9]",
		},
		{
			name:       "boolean literal as comparison value",
			expression: "count() > true",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "double NOT without valid grouping",
			expression: "NOT NOT (count() > 100)",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
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
		{
			name:       "float threshold",
			expression: "p99_latency < 999.99",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "p99(duration_nano)", Alias: "p99_latency"},
			},
			wantExpression: "__result_0 < 999.99",
		},
		{
			name:       "alternate not-equals operator (<>)",
			expression: "count() <> 0",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()"},
			},
			wantExpression: "__result_0 <> 0",
		},
		{
			name:       "three aggregations referenced",
			expression: "span_count > 10 AND avg_dur < 5000 AND p99_ns < 1000000",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: "span_count"},
				{Expression: "avg(duration_nano)", Alias: "avg_dur"},
				{Expression: "p99(duration_nano)", Alias: "p99_ns"},
			},
			wantExpression: "__result_0 > 10 AND __result_1 < 5000 AND __result_2 < 1000000",
		},
		{
			name:       "__result ambiguous with multiple aggregations",
			expression: "__result > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: "span_count"},
				{Expression: "avg(duration_nano)", Alias: "avg_dur"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [__result]",
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
		{
			name:       "__result0 indexed reference",
			expression: "__result0 > 70",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantExpression: "value > 70",
		},
		{
			name:       "combined space and time aggregation expression reference",
			expression: "avg(sum(cpu_usage)) > 50",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationAvg,
				},
			},
			wantExpression: "value > 50",
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
