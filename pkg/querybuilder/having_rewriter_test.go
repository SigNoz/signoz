package querybuilder

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
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

type logsAndTracesTestCase struct {
	name           string
	expression     string
	aggregations   []qbtypes.LogAggregation
	wantExpression string
	wantErr        bool
	wantErrMsg     string
	wantAdditional []string
}

func runLogsAndTracesTests(t *testing.T, tests []logsAndTracesTestCase) {
	t.Helper()
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
				_, _, _, _, _, additionalLogs := errors.Unwrapb(errLogs)
				assert.Equal(t, tt.wantAdditional, additionalLogs)
				require.Error(t, errTraces)
				assert.ErrorContains(t, errTraces, tt.wantErrMsg)
				_, _, _, _, _, additionalTraces := errors.Unwrapb(errTraces)
				assert.Equal(t, tt.wantAdditional, additionalTraces)
			} else {
				require.NoError(t, errLogs)
				assert.Equal(t, tt.wantExpression, gotLogs)
				require.NoError(t, errTraces)
				assert.Equal(t, tt.wantExpression, gotTraces)
			}
		})
	}
}

// TestRewriteForLogsAndTraces_ReferenceTypes covers the different ways an aggregation
// result can be referenced in a HAVING expression: by alias, by expression text, by
// __result shorthand, and by __resultN index.
func TestRewriteForLogsAndTraces_ReferenceTypes(t *testing.T) {
	runLogsAndTracesTests(t, []logsAndTracesTestCase{
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
		{
			name:       "reserved keyword as alias",
			expression: "sum > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "sum"},
			},
			wantExpression: "__result_0 > 100",
		},
		{
			name:       "comparison between two aggregation references",
			expression: "error_count > warn_count AND errors = warnings",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(errors)", Alias: "error_count"},
				{Expression: "sum(warnings)", Alias: "warn_count"},
				{Expression: "sum(errors)", Alias: "errors"},
				{Expression: "sum(warnings)", Alias: "warnings"},
			},
			wantExpression: "__result_0 > __result_1 AND __result_2 = __result_3",
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
	})
}

// TestRewriteForLogsAndTraces_BooleanOperators covers explicit AND/OR/NOT, implicit AND
// (adjacent comparisons), parenthesised groups, and associated error cases.
func TestRewriteForLogsAndTraces_BooleanOperators(t *testing.T) {
	runLogsAndTracesTests(t, []logsAndTracesTestCase{
		{
			name:       "implicit AND between two comparisons",
			expression: "total > 100 count() < 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 > 100 AND __result_0 < 500",
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
			name:       "nested parentheses with OR and AND",
			expression: "(a > 10 OR b > 20) AND c > 5",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "a"},
				{Expression: "count()", Alias: "b"},
				{Expression: "count()", Alias: "c"},
			},
			wantExpression: "(__result_0 > 10 OR __result_1 > 20) AND __result_2 > 5",
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
			name:       "NOT with single comparison",
			expression: "NOT (total > 100)",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "NOT (__result_0 > 100)",
		},
		{
			name:       "NOT without parentheses on function call",
			expression: "NOT count() > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantExpression: "NOT (__result_0 > 100)",
		},
		{
			name:       "NOT without parentheses on alias",
			expression: "NOT total > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "NOT (__result_0 > 100)",
		},
		// Error cases
		{
			name:       "double NOT without valid grouping",
			expression: "NOT NOT (count() > 100)",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:4 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got 'NOT'"},
		},
		{
			name:       "dangling AND at end",
			expression: "total_logs > 100 AND",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:20 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got EOF", "Suggestion: `total_logs > 100`"},
		},
		{
			name:       "dangling OR at start",
			expression: "OR total_logs > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:0 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got 'OR'", "Suggestion: `total_logs > 100`"},
		},
		{
			name:       "dangling OR at end",
			expression: "total > 100 OR",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:14 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got EOF", "Suggestion: `total > 100`"},
		},
		{
			name:       "consecutive AND operators",
			expression: "total_logs > 100 AND AND count() < 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:21 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got 'AND'"},
		},
		{
			name:       "AND followed immediately by OR",
			expression: "total > 100 AND OR count() < 50",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:16 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got 'OR'"},
		},
	})
}

// TestRewriteForLogsAndTraces_Arithmetic covers arithmetic operators (+, -, *, /, %),
// all comparison operators, and numeric literal forms.
func TestRewriteForLogsAndTraces_Arithmetic(t *testing.T) {
	runLogsAndTracesTests(t, []logsAndTracesTestCase{
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
		{
			name:       "numeric literals: negative, float, scientific notation",
			expression: "total > -10 AND total > 500.5 AND total > 1e6",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 > -10 AND __result_0 > 500.5 AND __result_0 > 1e6",
		},
		{
			name:       "arithmetic: modulo, subtraction, division, multiplication",
			expression: "cnt % 10 = 0 AND cnt - 10 > 0 AND errors / total > 0.05 AND cnt * 2 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "cnt"},
				{Expression: "sum(errors)", Alias: "errors"},
				{Expression: "count()", Alias: "total"},
			},
			wantExpression: "__result_0 % 10 = 0 AND __result_0 - 10 > 0 AND __result_1 / __result_2 > 0.05 AND __result_0 * 2 > 100",
		},
	})
}

// TestRewriteForLogsAndTraces_QuotedStringKeys covers aggregation expressions that
// contain quoted string arguments (e.g. countIf(level='error')). These keys cannot
// be parsed by the ANTLR grammar directly and are pre-substituted before parsing.
// Both single-quoted and double-quoted variants are tested, including implicit AND.
func TestRewriteForLogsAndTraces_QuotedStringKeys(t *testing.T) {
	runLogsAndTracesTests(t, []logsAndTracesTestCase{
		{
			// Implicit AND: two adjacent comparisons are joined with AND by the grammar.
			// Both single-quoted and double-quoted strings in aggregation expressions are pre-substituted.
			name:       "quoted string in aggregation expression referenced directly in having",
			expression: "countIf(level='error') > 0 countIf(level=\"info\") > 0",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "countIf(level='error')"},
				{Expression: `countIf(level="info")`},
			},
			wantExpression: "__result_0 > 0 AND __result_1 > 0",
		},
	})
}

// TestRewriteForLogsAndTraces_EdgeCases covers empty and whitespace-only expressions.
func TestRewriteForLogsAndTraces_EdgeCases(t *testing.T) {
	runLogsAndTracesTests(t, []logsAndTracesTestCase{
		{
			name:       "empty expression",
			expression: "",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantExpression: "",
		},
		{
			name:       "whitespace only expression",
			expression: "   ",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantExpression: "",
		},
	})
}

// TestRewriteForLogsAndTraces_ErrorInvalidReferences covers errors produced when the
// expression contains identifiers or function calls that do not match any aggregation.
func TestRewriteForLogsAndTraces_ErrorInvalidReferences(t *testing.T) {
	runLogsAndTracesTests(t, []logsAndTracesTestCase{
		{
			name:       "unknown identifier",
			expression: "unknown_alias > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [unknown_alias]",
			wantAdditional: []string{"Valid references are: [__result, __result0, count(), total]"},
		},
		{
			name:       "expression not in column map",
			expression: "sum(missing_field) > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [sum]",
			wantAdditional: []string{"Valid references are: [__result, __result0, count()]"},
		},
		{
			name:       "one valid one invalid reference",
			expression: "total > 100 AND ghost > 50",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [ghost]",
			wantAdditional: []string{"Valid references are: [__result, __result0, count(), total]"},
		},
		{
			name:       "__result ambiguous with multiple aggregations",
			expression: "__result > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
				{Expression: "sum(bytes)"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [__result]",
			wantAdditional: []string{"Valid references are: [__result0, __result1, count(), sum(bytes)]"},
		},
		{
			name:       "out-of-range __result_N index",
			expression: "__result_9 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [__result_9]",
			wantAdditional: []string{"Valid references are: [__result, __result0, count()]"},
		},
		{
			name:       "__result_1 out of range for single aggregation",
			expression: "__result_1 > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [__result_1]",
			wantAdditional: []string{"Valid references are: [__result, __result0, count()]"},
		},
		{
			name:       "cascaded function calls",
			expression: "sum(count()) > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [sum]",
			wantAdditional: []string{"Valid references are: [__result, __result0, count()]"},
		},
		{
			name:       "function call with multiple args not in column map",
			expression: "sum(a, b) > 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(a)"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [sum]",
			wantAdditional: []string{"Valid references are: [__result, __result0, sum(a)]"},
		},
		{
			name:       "unquoted string value treated as unknown identifier",
			expression: "sum(bytes) = xyz",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(bytes)"},
			},
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [xyz]",
			wantAdditional: []string{"Valid references are: [__result, __result0, sum(bytes)]"},
		},
	})
}

// TestRewriteForLogsAndTraces_ErrorSyntax covers expressions that produce syntax errors:
// malformed structure (bare operands, mismatched parentheses, missing operators) and
// invalid operand types (string literals, boolean literals).
func TestRewriteForLogsAndTraces_ErrorSyntax(t *testing.T) {
	runLogsAndTracesTests(t, []logsAndTracesTestCase{
		// Bare operands
		{
			name:       "bare function call without comparison",
			expression: "count()",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:7 expecting one of {!=, '+', <, <=, <>, =, >, >=} but got EOF", "Suggestion: `count() > 0`"},
		},
		{
			name:       "bare identifier without comparison",
			expression: "total_logs",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:10 expecting one of {!=, '+', <, <=, <>, =, >, >=} but got EOF", "Suggestion: `total_logs > 0`"},
		},
		// Parenthesis mismatches
		{
			name:       "unclosed parenthesis",
			expression: "(total_logs > 100 AND count() < 500",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:35 expecting one of {), ,} but got EOF", "Suggestion: `(total_logs > 100 AND count() < 500)`"},
		},
		{
			name:       "unexpected closing parenthesis",
			expression: "total_logs > 100)",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:16 extraneous input ')' expecting <EOF>"},
		},
		{
			name:       "only opening parenthesis",
			expression: "(",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:1 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got EOF"},
		},
		{
			name:       "only closing parenthesis",
			expression: ")",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:0 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got ')'"},
		},
		{
			name:       "empty parentheses",
			expression: "()",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:1 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got ')'"},
		},
		// Missing operands or operator
		{
			name:       "missing left operand",
			expression: "> 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:0 expecting one of {(, ), AND, IDENTIFIER, NOT, number} but got '>'; line 1:5 expecting one of {!=, '+', <, <=, <>, =, >, >=} but got EOF"},
		},
		{
			name:       "missing right operand",
			expression: "count() >",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:9 expecting one of {(, ), IDENTIFIER, number} but got EOF", "Suggestion: `count() > 0`"},
		},
		{
			name:       "missing comparison operator",
			expression: "count() 100",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:8 expecting one of {!=, '+', <, <=, <>, =, >, >=} but got '100'"},
		},
		// Invalid operand types
		{
			name:       "boolean literal as comparison value",
			expression: "count() > true",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()"},
			},
			wantErr:        true,
			wantErrMsg:     "Syntax error in `Having` expression",
			wantAdditional: []string{"line 1:10 expecting one of {(, ), IDENTIFIER, number} but got 'true'"},
		},
		{
			name:       "single-quoted string literal as comparison value",
			expression: "sum(bytes) = 'xyz'",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "sum(bytes)"},
			},
			wantErr:        true,
			wantErrMsg:     "`Having` expression contains string literals",
			wantAdditional: []string{"Aggregator results are numeric"},
		},
		{
			name:       "double-quoted string literal as comparison value",
			expression: `total > "threshold"`,
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total"},
			},
			wantErr:        true,
			wantErrMsg:     "`Having` expression contains string literals",
			wantAdditional: []string{"Aggregator results are numeric"},
		},
	})
}

func TestRewriteForMetrics(t *testing.T) {
	tests := []struct {
		name           string
		expression     string
		aggregations   []qbtypes.MetricAggregation
		wantExpression string
		wantErr        bool
		wantErrMsg     string
		wantAdditional []string
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
		// --- Happy path: empty or bare operand ---
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
			wantExpression: "",
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
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [wrong_metric]",
			wantAdditional: []string{"Valid references are: [__result, __result0, sum(cpu_usage)]"},
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
			wantErr:        true,
			wantErrMsg:     "`Having` expression contains string literals",
			wantAdditional: []string{"Aggregator results are numeric"},
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
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [cpu_usage]",
			wantAdditional: []string{"Valid references are: [__result, __result0, sum(cpu_usage)]"},
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
			wantErr:        true,
			wantErrMsg:     "Invalid references in `Having` expression: [count]",
			wantAdditional: []string{"Valid references are: [__result, __result0, sum(cpu_usage)]"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := NewHavingExpressionRewriter()
			got, err := r.RewriteForMetrics(tt.expression, tt.aggregations)
			if tt.wantErr {
				require.Error(t, err)
				assert.ErrorContains(t, err, tt.wantErrMsg)
				_, _, _, _, _, additional := errors.Unwrapb(err)
				assert.Equal(t, tt.wantAdditional, additional)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantExpression, got)
			}
		})
	}
}
