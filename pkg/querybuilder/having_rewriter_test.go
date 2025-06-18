package querybuilder

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

func TestHavingExpressionRewriter_RewriteForTraces(t *testing.T) {
	tests := []struct {
		name         string
		expression   string
		aggregations []qbtypes.TraceAggregation
		expected     string
	}{
		{
			name:       "single aggregation with __result",
			expression: "__result > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: ""},
			},
			expected: "__result_0 > 100",
		},
		{
			name:       "single aggregation with alias",
			expression: "total_count > 100 AND total_count < 1000",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: "total_count"},
			},
			expected: "__result_0 > 100 AND __result_0 < 1000",
		},
		{
			name:       "multiple aggregations with aliases",
			expression: "error_count > 10 OR success_count > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "countIf(status = 'error')", Alias: "error_count"},
				{Expression: "countIf(status = 'success')", Alias: "success_count"},
			},
			expected: "__result_0 > 10 OR __result_1 > 100",
		},
		{
			name:       "expression reference",
			expression: "count() > 50",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: ""},
			},
			expected: "__result_0 > 50",
		},
		{
			name:       "__result{number} format",
			expression: "__result0 > 10 AND __result1 < 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: ""},
				{Expression: "sum(duration)", Alias: ""},
			},
			expected: "__result_0 > 10 AND __result_1 < 100",
		},
		{
			name:       "complex expression with parentheses",
			expression: "(total > 100 AND errors < 10) OR (total < 50 AND errors = 0)",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: "total"},
				{Expression: "countIf(error = true)", Alias: "errors"},
			},
			expected: "(__result_0 > 100 AND __result_1 < 10) OR (__result_0 < 50 AND __result_1 = 0)",
		},
		{
			name:       "with quoted strings",
			expression: "status = 'active' AND count > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "status", Alias: "status"},
				{Expression: "count()", Alias: "count"},
			},
			expected: "__result_0 = 'active' AND __result_1 > 100",
		},
		{
			name:       "avoid partial replacements",
			expression: "count_distinct > 10 AND count > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count_distinct(user_id)", Alias: "count_distinct"},
				{Expression: "count()", Alias: "count"},
			},
			expected: "__result_0 > 10 AND __result_1 > 100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rewriter := NewHavingExpressionRewriter()
			result := rewriter.RewriteForTraces(tt.expression, tt.aggregations)
			if result != tt.expected {
				t.Errorf("Expected: %s, Got: %s", tt.expected, result)
			}
		})
	}
}

func TestHavingExpressionRewriter_RewriteForLogs(t *testing.T) {
	tests := []struct {
		name         string
		expression   string
		aggregations []qbtypes.LogAggregation
		expected     string
	}{
		{
			name:       "single aggregation with __result",
			expression: "__result > 1000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: ""},
			},
			expected: "__result_0 > 1000",
		},
		{
			name:       "multiple aggregations with aliases and expressions",
			expression: "total_logs > 1000 AND avg(size) < 1024",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "count()", Alias: "total_logs"},
				{Expression: "avg(size)", Alias: ""},
			},
			expected: "__result_0 > 1000 AND __result_1 < 1024",
		},
		{
			name:       "complex boolean expression",
			expression: "(error_logs > 100 AND error_logs < 1000) OR warning_logs > 5000",
			aggregations: []qbtypes.LogAggregation{
				{Expression: "countIf(level = 'error')", Alias: "error_logs"},
				{Expression: "countIf(level = 'warning')", Alias: "warning_logs"},
			},
			expected: "(__result_0 > 100 AND __result_0 < 1000) OR __result_1 > 5000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rewriter := NewHavingExpressionRewriter()
			result := rewriter.RewriteForLogs(tt.expression, tt.aggregations)
			if result != tt.expected {
				t.Errorf("Expected: %s, Got: %s", tt.expected, result)
			}
		})
	}
}

func TestHavingExpressionRewriter_RewriteForMetrics(t *testing.T) {
	tests := []struct {
		name         string
		expression   string
		aggregations []qbtypes.MetricAggregation
		expected     string
	}{
		{
			name:       "metric with space aggregation",
			expression: "avg(cpu_usage) > 80",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					SpaceAggregation: metrictypes.SpaceAggregationAvg,
				},
			},
			expected: "value > 80",
		},
		{
			name:       "metric with time aggregation",
			expression: "rate(requests) > 1000",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:      "requests",
					TimeAggregation: metrictypes.TimeAggregationRate,
				},
			},
			expected: "value > 1000",
		},
		{
			name:       "metric with both aggregations",
			expression: "sum(rate(requests)) > 5000",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "requests",
					TimeAggregation:  metrictypes.TimeAggregationRate,
					SpaceAggregation: metrictypes.SpaceAggregationSum,
				},
			},
			expected: "value > 5000",
		},
		{
			name:       "metric with __result",
			expression: "__result < 100",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "memory_usage",
					SpaceAggregation: metrictypes.SpaceAggregationMax,
				},
			},
			expected: "value < 100",
		},
		{
			name:       "metric name without aggregation",
			expression: "temperature > 30",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName: "temperature",
				},
			},
			expected: "value > 30",
		},
		{
			name:       "complex expression with parentheses",
			expression: "(avg(cpu_usage) > 80 AND avg(cpu_usage) < 95) OR __result > 99",
			aggregations: []qbtypes.MetricAggregation{
				{
					MetricName:       "cpu_usage",
					SpaceAggregation: metrictypes.SpaceAggregationAvg,
				},
			},
			expected: "(value > 80 AND value < 95) OR value > 99",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rewriter := NewHavingExpressionRewriter()
			result := rewriter.RewriteForMetrics(tt.expression, tt.aggregations)
			if result != tt.expected {
				t.Errorf("Expected: %s, Got: %s", tt.expected, result)
			}
		})
	}
}

func TestHavingExpressionRewriter_EdgeCases(t *testing.T) {
	tests := []struct {
		name         string
		expression   string
		aggregations []qbtypes.TraceAggregation
		expected     string
	}{
		{
			name:         "empty expression",
			expression:   "",
			aggregations: []qbtypes.TraceAggregation{},
			expected:     "",
		},
		{
			name:       "no matching columns",
			expression: "unknown_column > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "count()", Alias: "total"},
			},
			expected: "unknown_column > 100",
		},
		{
			name:       "expression within quoted string",
			expression: "status = 'count() > 100' AND total > 100",
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "status", Alias: "status"},
				{Expression: "count()", Alias: "total"},
			},
			expected: "__result_0 = 'count() > 100' AND __result_1 > 100",
		},
		{
			name:       "double quotes",
			expression: `name = "test" AND count > 10`,
			aggregations: []qbtypes.TraceAggregation{
				{Expression: "name", Alias: "name"},
				{Expression: "count()", Alias: "count"},
			},
			expected: `__result_0 = "test" AND __result_1 > 10`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rewriter := NewHavingExpressionRewriter()
			result := rewriter.RewriteForTraces(tt.expression, tt.aggregations)
			if result != tt.expected {
				t.Errorf("Expected: %s, Got: %s", tt.expected, result)
			}
		})
	}
}
