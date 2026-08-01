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
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id/checkout"},
			},
		},
		{
			name: "resource prefixed key",
			body: builderQueryBody("traces", "resource.signoz.workspace.key.id = 'checkout'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/signoz.workspace.key.id/checkout"},
			},
		},
		{
			name: "in atom requires every value",
			body: builderQueryBody("logs", "signoz.workspace.key.id IN ('b', 'a')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id/a"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id/b"},
			},
		},
		{
			name: "multiple equality atoms each require a grant",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'b' AND signoz.workspace.key.id = 'a'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id/a"},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id/b"},
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
			name: "key atom under or does not qualify",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'a' OR status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "negated key atom does not qualify",
			body: builderQueryBody("logs", "NOT signoz.workspace.key.id = 'a'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "key inequality does not qualify",
			body: builderQueryBody("logs", "signoz.workspace.key.id != 'a'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/*"},
			},
		},
		{
			name: "value with spaces and slashes stays plaintext in the id",
			body: builderQueryBody("logs", "signoz.workspace.key.id = 'check out/2'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id/check out/2"},
			},
		},
		{
			name: "audit source maps to audit logs resource",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","source":"audit","filter":{"expression":"signoz.workspace.key.id = 'a'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceAuditLogs, ID: "builder_query/signoz.workspace.key.id/a"},
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
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: "builder_query/signoz.workspace.key.id/checkout"},
			},
		},
		{
			name: "variable substitution qualifies",
			body: `{"variables":{"key":{"value":"checkout"}},"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id = $key"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id/checkout"},
			},
		},
		{
			name: "duplicate queries dedupe",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id = 'a'"}}},{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"signoz.workspace.key.id='a'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: "builder_query/signoz.workspace.key.id/a"},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			refs, err := QueryRangeResources(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
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
		_, err := QueryRangeResources(coretypes.ExtractorContext{RequestBody: []byte(body)})
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

	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id/a"))
	assert.Equal(t, []string{"builder_query/*", "*"}, selectorValues("builder_query"))
	assert.Equal(t, []string{"promql/*", "*"}, selectorValues("promql"))
	assert.Equal(t, []string{"*"}, selectorValues("*"))
	// a value containing "/" stays one logical segment (SplitN 3).
	assert.Equal(t, []string{"builder_query/signoz.workspace.key.id/a/b", "builder_query/signoz.workspace.key.id/*", "builder_query/*", "*"}, selectorValues("builder_query/signoz.workspace.key.id/a/b"))
}
