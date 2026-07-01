package querybuildertypesv5

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateAggregation(t *testing.T) {
	testCases := []struct {
		description    string
		queryData      map[string]any
		panelType      string
		expectedOutput []any
	}{
		{
			description:    "nil query data yields no aggregations",
			queryData:      nil,
			expectedOutput: []any{},
		},
		{
			description:    "single logs expression is left untouched",
			queryData:      map[string]any{"dataSource": "logs", "aggregations": []any{map[string]any{"expression": "count()"}}},
			expectedOutput: []any{map[string]any{"expression": "count()"}},
		},
		{
			description: "comma separated trace expressions are split into one object each",
			queryData:   map[string]any{"dataSource": "traces", "aggregations": []any{map[string]any{"expression": "count(), sum(price)"}}},
			expectedOutput: []any{
				map[string]any{"expression": "count()"},
				map[string]any{"expression": "sum(price)"},
			},
		},
		{
			description: "inline alias is preserved and unquoted",
			queryData:   map[string]any{"dataSource": "logs", "aggregations": []any{map[string]any{"expression": "count() as 'total', sum(price) as revenue"}}},
			expectedOutput: []any{
				map[string]any{"expression": "count()", "alias": "total"},
				map[string]any{"expression": "sum(price)", "alias": "revenue"},
			},
		},
		{
			description: "space separated expressions split with an unquoted alias on the first only",
			queryData:   map[string]any{"dataSource": "logs", "aggregations": []any{map[string]any{"expression": "count() as cnt avg(code.lineno) "}}},
			expectedOutput: []any{
				map[string]any{"expression": "count()", "alias": "cnt"},
				map[string]any{"expression": "avg(code.lineno)"},
			},
		},
		{
			description:    "fallback alias is applied when expression has no inline alias",
			queryData:      map[string]any{"dataSource": "logs", "aggregations": []any{map[string]any{"expression": "count()", "alias": "hits"}}},
			expectedOutput: []any{map[string]any{"expression": "count()", "alias": "hits"}},
		},
		{
			description:    "commas inside function arguments do not split the expression",
			queryData:      map[string]any{"dataSource": "traces", "aggregations": []any{map[string]any{"expression": "countIf(day > 10, status)"}}},
			expectedOutput: []any{map[string]any{"expression": "countIf(day > 10, status)"}},
		},
		{
			description:    "unparseable expression falls back to count()",
			queryData:      map[string]any{"dataSource": "logs", "aggregations": []any{map[string]any{"expression": "not-an-aggregation"}}},
			expectedOutput: []any{map[string]any{"expression": "count()"}},
		},
		{
			description:    "empty aggregations fall back to count()",
			queryData:      map[string]any{"dataSource": "logs", "aggregations": []any{}},
			expectedOutput: []any{map[string]any{"expression": "count()"}},
		},
		{
			description:    "missing aggregations fall back to count()",
			queryData:      map[string]any{"dataSource": "traces"},
			expectedOutput: []any{map[string]any{"expression": "count()"}},
		},
		{
			description: "metric aggregation is built from the first aggregation",
			queryData: map[string]any{
				"dataSource": "metrics",
				"aggregations": []any{map[string]any{
					"metricName":       "http_requests_total",
					"temporality":      "delta",
					"timeAggregation":  "rate",
					"spaceAggregation": "sum",
				}},
			},
			expectedOutput: []any{map[string]any{
				"metricName":       "http_requests_total",
				"temporality":      "delta",
				"timeAggregation":  "rate",
				"spaceAggregation": "sum",
			}},
		},
		{
			description: "metric omits temporality when empty, matching the frontend `|| undefined`",
			panelType:   "table",
			queryData: map[string]any{
				"dataSource":       "metrics",
				"timeAggregation":  "sum",
				"spaceAggregation": "avg",
				"temporality":      "",
				"reduceTo":         "avg",
				"aggregations": []any{map[string]any{
					"metricName":       "cpu_usage",
					"temporality":      "",
					"timeAggregation":  "sum",
					"spaceAggregation": "avg",
					"reduceTo":         "avg",
				}},
			},
			expectedOutput: []any{map[string]any{
				"metricName":       "cpu_usage",
				"timeAggregation":  "sum",
				"spaceAggregation": "avg",
				"reduceTo":         "avg",
			}},
		},
		{
			description: "metric includes reduceTo for table/pie/value panels",
			panelType:   "table",
			queryData: map[string]any{
				"dataSource": "metrics",
				"aggregations": []any{map[string]any{
					"metricName":       "http_requests_total",
					"timeAggregation":  "rate",
					"spaceAggregation": "sum",
					"reduceTo":         "avg",
				}},
			},
			expectedOutput: []any{map[string]any{
				"metricName":       "http_requests_total",
				"timeAggregation":  "rate",
				"spaceAggregation": "sum",
				"reduceTo":         "avg",
			}},
		},
		{
			description: "metric drops reduceTo for other panels even when query data has it",
			panelType:   "graph",
			queryData: map[string]any{
				"dataSource": "metrics",
				"aggregations": []any{map[string]any{
					"metricName":       "http_requests_total",
					"timeAggregation":  "rate",
					"spaceAggregation": "sum",
					"reduceTo":         "avg",
				}},
			},
			expectedOutput: []any{map[string]any{
				"metricName":       "http_requests_total",
				"timeAggregation":  "rate",
				"spaceAggregation": "sum",
			}},
		},
		{
			description: "metric falls back to legacy aggregateAttribute and top-level fields",
			queryData: map[string]any{
				"dataSource":         "metrics",
				"aggregateAttribute": map[string]any{"key": "legacy_metric", "temporality": "cumulative"},
				"timeAggregation":    "avg",
				"spaceAggregation":   "max",
			},
			expectedOutput: []any{map[string]any{
				"metricName":       "legacy_metric",
				"temporality":      "cumulative",
				"timeAggregation":  "avg",
				"spaceAggregation": "max",
			}},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.description, func(t *testing.T) {
			assert.Equal(t, testCase.expectedOutput, CreateAggregation(testCase.queryData, testCase.panelType))
		})
	}
}
