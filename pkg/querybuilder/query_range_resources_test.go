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
			name: "top level service equality",
			body: builderQueryBody("logs", "service.name = 'checkout' AND status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: `["checkout"]`},
			},
		},
		{
			name: "resource prefixed service key",
			body: builderQueryBody("traces", "resource.service.name = 'checkout'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: `["checkout"]`},
			},
		},
		{
			name: "in atom requires every value",
			body: builderQueryBody("logs", "service.name IN ('b', 'a')"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: `["a"]`},
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: `["b"]`},
			},
		},
		{
			name: "multiple equality atoms are alternatives",
			body: builderQueryBody("logs", "service.name = 'b' AND service.name = 'a'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: `["a","b"]`},
			},
		},
		{
			name: "no filter expression",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: ""},
			},
		},
		{
			name: "service atom under or does not qualify",
			body: builderQueryBody("logs", "service.name = 'a' OR status = 500"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: ""},
			},
		},
		{
			name: "negated service atom does not qualify",
			body: builderQueryBody("logs", "NOT service.name = 'a'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: ""},
			},
		},
		{
			name: "service inequality does not qualify",
			body: builderQueryBody("logs", "service.name != 'a'"),
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: ""},
			},
		},
		{
			name: "audit source maps to audit logs resource",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","source":"audit","filter":{"expression":"service.name = 'a'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceAuditLogs, ID: `["a"]`},
			},
		},
		{
			name: "promql is wildcard only",
			body: `{"compositeQuery":{"queries":[{"type":"promql","spec":{"query":"up"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: ""},
			},
		},
		{
			name: "clickhouse sql covers all signals",
			body: `{"compositeQuery":{"queries":[{"type":"clickhouse_sql","spec":{"query":"SELECT 1"}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: ""},
				{Resource: coretypes.ResourceTelemetryResourceTraces, ID: ""},
				{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: ""},
			},
		},
		{
			name:     "formula produces no resources",
			body:     `{"compositeQuery":{"queries":[{"type":"builder_formula","spec":{"expression":"A/B"}}]}}`,
			expected: []coretypes.ResourceWithID{},
		},
		{
			name: "variable substitution qualifies",
			body: `{"variables":{"svc":{"value":"checkout"}},"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"service.name = $svc"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: `["checkout"]`},
			},
		},
		{
			name: "duplicate queries dedupe",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"service.name = 'a'"}}},{"type":"builder_query","spec":{"signal":"logs","filter":{"expression":"service.name='a'"}}}]}}`,
			expected: []coretypes.ResourceWithID{
				{Resource: coretypes.ResourceTelemetryResourceLogs, ID: `["a"]`},
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
		builderQueryBody("logs", "service.name = "),
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

	selectors, err := TelemetrySelector(context.Background(), coretypes.ResourceTelemetryResourceLogs, `["a","b"]`, orgID)
	require.NoError(t, err)
	values := make([]string, 0, len(selectors))
	for _, selector := range selectors {
		values = append(values, selector.String())
	}
	assert.Equal(t, []string{"a", "b", "*"}, values)

	selectors, err = TelemetrySelector(context.Background(), coretypes.ResourceTelemetryResourceLogs, "", orgID)
	require.NoError(t, err)
	require.Len(t, selectors, 1)
	assert.Equal(t, "*", selectors[0].String())

	_, err = TelemetrySelector(context.Background(), coretypes.ResourceTelemetryResourceLogs, "not-json", orgID)
	assert.Error(t, err)
}
