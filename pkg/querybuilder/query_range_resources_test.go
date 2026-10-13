package querybuilder

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func builderQueryBody(signal, filterExpression string) string {
	return `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"` + signal + `","filter":{"expression":"` + filterExpression + `"}}}]}}`
}

func TestQueryRangeResources(t *testing.T) {
	testCases := []struct {
		name     string
		body     string
		expected []coretypes.ResourceWithID
	}{
		{
			name: "top level key equality",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'checkout' AND status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'checkout' AND status = 500"},
			},
		},
		{
			name: "resource prefixed key",
			body: builderQueryBody("traces", "resource.signoz.workspace.key.id = 'checkout'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/resource.signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "in atom is a union of one resource per value",
			body: builderQueryBody("logs", "signoz.workspace.key.id IN ('b', 'a')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'a'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'b'"},
			},
		},
		{
			name: "conjunction is one resource",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'b' AND signoz.workspace.key.id = 'a'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'a' AND signoz.workspace.key.id = 'b'"},
			},
		},
		{
			name: "atoms on different keys are one resource",
			body: builderQueryBody("logs", "resource.service.name = 'checkout' AND resource.deployment.environment.name = 'prod'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.deployment.environment.name = 'prod' AND resource.service.name = 'checkout'"},
			},
		},
		{
			name: "list with another atom expands into disjuncts",
			body: builderQueryBody("logs", "resource.service.name IN ('b', 'a') AND signoz.workspace.key.id = 'k'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'a' AND signoz.workspace.key.id = 'k'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'b' AND signoz.workspace.key.id = 'k'"},
			},
		},
		{
			name: "two lists expand into every combination",
			body: builderQueryBody("logs", "resource.service.name IN ('a', 'b') AND signoz.workspace.key.id IN ('y', 'z')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'a' AND signoz.workspace.key.id = 'y'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'a' AND signoz.workspace.key.id = 'z'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'b' AND signoz.workspace.key.id = 'y'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'b' AND signoz.workspace.key.id = 'z'"},
			},
		},
		{
			name: "two lists on one key stay one resource",
			body: builderQueryBody("logs", "signoz.workspace.key.id IN ('a', 'b') AND resource.signoz.workspace.key.id IN ('b', 'c')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.signoz.workspace.key.id IN ('b', 'c') AND signoz.workspace.key.id IN ('a', 'b')"},
			},
		},
		{
			name: "old environment spelling is part of the id but not a selector",
			body: builderQueryBody("traces", "resource.deployment.environment = 'prod'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/resource.deployment.environment = 'prod'"},
			},
		},
		{
			name: "service values in list",
			body: builderQueryBody("logs", "resource.service.name IN ('frontend', 'checkout')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'checkout'"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/resource.service.name = 'frontend'"},
			},
		},
		{
			name: "bare customer key is part of the id but not a selector",
			body: builderQueryBody("logs", "service.name = 'checkout'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/service.name = 'checkout'"},
			},
		},
		{
			name: "no filter expression",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "or keeps the whole filter as the id",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'a' OR status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'a' OR status = 500"},
			},
		},
		{
			name: "list under or is not expanded",
			body: builderQueryBody("logs", "signoz.workspace.key.id IN ('a', 'b') OR status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id IN ('a', 'b') OR status = 500"},
			},
		},
		{
			name: "value with spaces and slashes stays plaintext in the id",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'check out/2'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'check out/2'"},
			},
		},
		{
			name: "audit source maps to audit logs resource",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","source":"audit","filter":{"expression":"signoz.workspace.key.id = 'a'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceAuditLogs, ID: "builder_query/signoz.workspace.key.id = 'a'"},
			},
		},
		{
			name: "ai builder query maps to traces resource without a signal",
			body: `{"compositeQuery":{"queries":[{"type":"builder_ai_query","spec":{"filter":{"expression":"signoz.workspace.key.id = 'checkout'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_ai_query/signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "ai builder query without filter is wildcard",
			body: `{"compositeQuery":{"queries":[{"type":"builder_ai_query","spec":{}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_ai_query/*"},
			},
		},
		{
			name: "promql is wildcard only",
			body: `{"compositeQuery":{"queries":[{"type":"promql","spec":{"query":"up"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: "promql/*"},
			},
		},
		{
			name: "clickhouse sql covers all signals",
			body: `{"compositeQuery":{"queries":[{"type":"clickhouse_sql","spec":{"query":"SELECT 1"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "clickhouse_sql/*"},
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "clickhouse_sql/*"},
				{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: "clickhouse_sql/*"},
				{Resource: coretypes.ResourceTelemetryResourceMeterMetrics, ID: "clickhouse_sql/*"},
			},
		},
		{
			name:     "formula produces no resources",
			body:     `{"compositeQuery":{"queries":[{"type":"builder_formula","spec":{"expression":"A/B"}}]}}`,
			expected: []coretypes.ResourceWithID{},
		},
		{
			name: "trace operator rides on its referenced queries",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"name":"A","signal":"traces","disabled":true,"filter":{"expression":"signoz.workspace.key.id = 'checkout'"}}},{"type":"builder_query","spec":{"name":"B","signal":"traces","disabled":true,"filter":{"expression":"signoz.workspace.key.id = 'checkout' AND has_error = true"}}},{"type":"builder_trace_operator","spec":{"name":"T1","expression":"A => B","returnSpansFrom":"A"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/signoz.workspace.key.id = 'checkout'"},
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/has_error = true AND signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "variable substitution qualifies",
			body: `{"variables":{"key":{"value":"checkout"}},"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id = $key"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'checkout'"},
			},
		},
		{
			name: "duplicate queries dedupe",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id = 'a'"}}},{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id='a'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id = 'a'"},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			refs, err := NewQueryRangeResources(64)(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, refs)
		})
	}
}

func TestQueryRangeResourcesErrors(t *testing.T) {
	bodies := []string{
		`{"compositeQuery":{"queries":[]}}`,
		`{}`,
		builderQueryBody("logs", "signoz.workspace.key.id = "),
		`{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"unknown"}}]}}`,
		`{"compositeQuery":{"queries":[{"type":"unknown_type"}]}}`,
	}

	for _, body := range bodies {
		_, err := NewQueryRangeResources(64)(coretypes.ExtractorContext{RequestBody: []byte(body)})
		assert.Error(t, err, "body %s", body)
	}
}

func TestTelemetrySelector(t *testing.T) {
	orgID := valuer.GenerateUUID()

	selectorValues := func(id string) []string {
		selectors, err := TelemetrySelector(context.Background(), coretypes.ResourceTelemetryResourceLogs, id, orgID)
		require.NoError(t, err)
		values := make([]string, 0, len(selectors))
		for _, selector := range selectors {
			values = append(values, selector.String())
		}
		return values
	}

	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id = 'a'"))
	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/resource.signoz.workspace.key.id = 'a' AND status = 500"))
	assert.Equal(t, []string{
		"builder_query/resource.service.name/x",
		"builder_query/resource.service.name/*",
		"builder_query/signoz.workspace.key.id/z",
		"builder_query/signoz.workspace.key.id/*",
		"builder_query/*",
		"*",
	}, selectorValues("builder_query/resource.service.name = 'x' AND signoz.workspace.key.id = 'z'"))
	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id IN ('a', 'b')"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id = 'a' OR status = 500"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query/service.name = 'x'"))
	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a/b", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id = 'a/b'"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query/*"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query"))
	assert.Equal(t, []string{"promql/*", "*"}, selectorValues("promql/*"))
	assert.Equal(t, []string{"*"}, selectorValues("*"))

	_, err := TelemetrySelector(context.Background(), coretypes.ResourceTelemetryResourceLogs, "builder_query/signoz.workspace.key.id = ", orgID)
	assert.Error(t, err)
}

func TestQueryRangeResourcesDisjunctCap(t *testing.T) {
	body := []byte(builderQueryBody("logs", "resource.service.name IN ('a', 'b') AND signoz.workspace.key.id IN ('y', 'z')"))

	expanded, err := NewQueryRangeResources(4)(coretypes.ExtractorContext{RequestBody: body})
	require.NoError(t, err)
	assert.Len(t, expanded, 4)

	capped, err := NewQueryRangeResources(3)(coretypes.ExtractorContext{RequestBody: body})
	require.NoError(t, err)
	require.Len(t, capped, 1)
	assert.Equal(t, "builder_query/resource.service.name IN ('a', 'b') AND signoz.workspace.key.id IN ('y', 'z')", capped[0].ID)
}
