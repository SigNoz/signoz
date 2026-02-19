package querybuilder

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func toTraceAggregations(logs []qbtypes.LogAggregation) []qbtypes.TraceAggregation {
	out := make([]qbtypes.TraceAggregation, len(logs))
	for i, l := range logs {
		out[i] = qbtypes.TraceAggregation{Expression: l.Expression, Alias: l.Alias}
	}
	return out
}

func TestRewriteForLogsAndTraces(t *testing.T) {
	tests := []struct {
		name           string
		expression     string
		aggregations   []qbtypes.LogAggregation
		wantExpression string
		wantErr        bool
		wantErrMsg     string
	}{
		// --- Happy path: reference types (alias, expression, __result variants) ---
		{
			name:       "alias reference",
			expression: "total_logs > 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantExpression: "__result_0 > 1000",
		},
		{
			name:       "expression reference",
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
		// --- Happy path: boolean logic (AND, OR, NOT, parentheses) ---
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
		// --- Happy path: arithmetic operators (+, -, *, /, %) ---
		{
			name:       "arithmetic on aggregations",
			expression: "sum_a + sum_b > 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(a)", Alias: "sum_a"},
				{Expression: "sum(b)", Alias: "sum_b"},
			},
			wantExpression: "__result_0 + __result_1 > 1000",
		},
		// --- Happy path: comparison operators (=, ==, !=, <>, <, <=, >, >=) ---
		{
			name:       "comparison operators != <> ==",
			expression: "total != 0 AND count() <> 0 AND total == 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 != 0 AND __result_0 <> 0 AND __result_0 == 100",
		},
		{
			name:       "comparison operators < <= > >=",
			expression: "total < 100 AND total <= 500 AND total > 10 AND total >= 50",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 < 100 AND __result_0 <= 500 AND __result_0 > 10 AND __result_0 >= 50",
		},
		// --- Happy path: numeric literals (negative, float, scientific notation) ---
		{
			name:       "numeric literals",
			expression: "total > -10 AND total > 500.5 AND total > 1e6",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 > -10 AND __result_0 > 500.5 AND __result_0 > 1e6",
		},
		{
			name:       "arithmetic modulo subtraction division multiplication",
			expression: "cnt % 10 = 0 AND cnt - 10 > 0 AND errors / total > 0.05 AND cnt * 2 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "cnt"},
				{Expression: "sum(errors)", Alias: "errors"},
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 % 10 = 0 AND __result_0 - 10 > 0 AND __result_1 / __result_2 > 0.05 AND __result_0 * 2 > 100",
		},
		// --- Happy path: OR with multiple operands ---
		{
			name:       "OR with three operands",
			expression: "a > 1 OR b > 2 OR c > 3",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "a"},
				{Expression: "count()", Alias: "b"},
				{Expression: "count()", Alias: "c"},
			},
			wantExpression: "__result_0 > 1 OR __result_1 > 2 OR __result_2 > 3",
		},
		{
			name:       "NOT with single comparison",
			expression: "NOT (total > 100)",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "NOT (__result_0 > 100)",
		},
		{
			name:       "nested parentheses with OR and AND",
			expression: "(a > 10 OR b > 20) AND c > 5",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "a"},
				{Expression: "count()", Alias: "b"},
				{Expression: "count()", Alias: "c"},
			},
			wantExpression: "(__result_0 > 10 OR __result_1 > 20) AND __result_2 > 5",
		},
		// --- Happy path: comparison between two aggregation references ---
		{
			name:       "comparison between aggregations",
			expression: "error_count > warn_count AND errors = warnings",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(errors)", Alias: "error_count"},
				{Expression: "sum(warnings)", Alias: "warn_count"},
				{Expression: "sum(errors)", Alias: "errors"},
				{Expression: "sum(warnings)", Alias: "warnings"},
			},
			wantExpression: "__result_0 > __result_1 AND __result_2 = __result_3",
		},
		// --- Happy path: edge case (reserved keyword used as alias) ---
		{
			name:       "reserved keyword as alias",
			expression: "sum > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "sum"},
			},
			wantExpression: "__result_0 > 100",
		},
		// --- Error: bare operand / missing comparison operator ---
		{
			name:       "urinary expression alias",
			expression: "total_logs",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "bare expression (function call)",
			expression: "count()",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "bare operand without comparison",
			expression: "total_logs",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		// --- Error: parentheses mismatch (unclosed, unexpected, empty) ---
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
		// --- Error: dangling or malformed boolean operators (AND, OR) ---
		{
			name:       "consecutive boolean operators",
			expression: "total_logs > 100 AND AND count() < 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		// --- Error: invalid operand types (string literals, boolean literal) ---
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
		// --- Error: invalid or unknown references ---
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
			wantErrMsg: "aggregation functions are not allowed in HAVING expression",
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
			name:       "__result ambiguous with multiple aggregations",
			expression: "__result > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
				{Expression: "sum(bytes)"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [__result]",
		},
		// --- Error: NOT syntax (must wrap comparison in parentheses) ---
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
		// --- Error: malformed comparison (missing operand, operator, or connector) ---
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
		// --- Error: boolean literal as comparison value ---
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
		// --- Error: invalid function calls (cascaded, wrong args) ---
		{
			name:       "cascaded function calls",
			expression: "sum(count()) > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "aggregation functions are not allowed in HAVING expression",
		},
		// --- Error: empty or whitespace-only expression ---
		{
			name:       "whitespace only expression",
			expression: "   ",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		// --- Error: standalone parentheses ---
		{
			name:       "only opening parenthesis",
			expression: "(",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "only closing parenthesis",
			expression: ")",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "empty parentheses",
			expression: "()",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		// --- Error: missing comparison operands or operator ---
		{
			name:       "missing left operand",
			expression: "> 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "missing right operand",
			expression: "count() >",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "missing operator",
			expression: "count() 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "dangling OR at end",
			expression: "total > 100 OR",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "AND OR without second operand",
			expression: "total > 100 AND OR count() < 50",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		{
			name:       "NOT without parentheses on alias",
			expression: "NOT total > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		// --- Error: invalid function call (not in column map) ---
		{
			name:       "function call with multiple args not in column map",
			expression: "sum(a, b) > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(a)"},
			},
			wantErr:    true,
			wantErrMsg: "aggregation functions are not allowed in HAVING expression",
		},
		// --- Error: out-of-range __result index ---
		{
			name:       "__result_1 out of range for single aggregation",
			expression: "__result_1 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression: [__result_1]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := NewHavingExpressionRewriter()
			traceAggs := toTraceAggregations(tt.aggregations)
			gotLogs, errLogs := r.RewriteForLogs(tt.expression, tt.aggregations)
			r2 := NewHavingExpressionRewriter()
			gotTraces, errTraces := r2.RewriteForTraces(tt.expression, traceAggs)
			if tt.wantErr {
				require.Error(t, errLogs)
				assert.ErrorContains(t, errLogs, tt.wantErrMsg)
				require.Error(t, errTraces)
				assert.ErrorContains(t, errTraces, tt.wantErrMsg)
			} else {
				require.NoError(t, errLogs)
				assert.Equal(t, tt.wantExpression, gotLogs)
				require.NoError(t, errTraces)
				assert.Equal(t, tt.wantExpression, gotTraces)
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
		// --- Happy path: reference types (time/space aggregation, __result, bare metric) ---
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
			name:       "combined space and time aggregation",
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
		// --- Happy path: comparison operators and arithmetic ---
		{
			name:       "comparison operators and arithmetic",
			expression: "sum(cpu_usage) < 100 AND sum(cpu_usage) * 2 > 50",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantExpression: "value < 100 AND value * 2 > 50",
		},
		// --- Error: invalid or unknown metric reference ---
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
		// --- Error: empty or bare operand ---
		{
			name:       "empty expression",
			expression: "",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		// --- Error: string literal (not allowed in HAVING) ---
		{
			name:       "string literal rejected",
			expression: "cpu_usage = 'high'",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantErr:    true,
			wantErrMsg: "HAVING expression cannot contain string literals",
		},
		// --- Error: bare operand (no comparison) ---
		{
			name:       "bare operand without comparison",
			expression: "cpu_usage",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantErr:    true,
			wantErrMsg: "syntax error in HAVING expression",
		},
		// --- Error: aggregation not in column map ---
		{
			name:       "aggregation not in column map",
			expression: "count(cpu_usage) > 10",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					TimeAggregation:  metrictypes.TimeAggregationSum,
					SpaceAggregation: metrictypes.SpaceAggregationUnspecified,
				},
			},
			wantErr:    true,
			wantErrMsg: "invalid references in HAVING expression",
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
