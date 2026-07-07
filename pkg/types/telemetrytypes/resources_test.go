package telemetrytypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQueryRangeResources(t *testing.T) {
	whereSegment := selectorSegment("service.name = 'frontend'")
	emptyWhereSegment := selectorSegment("")
	metricSegment := selectorSegment("http.server.duration.count")

	testCases := []struct {
		name     string
		body     string
		expected map[string]string
	}{
		{
			name: "traces builder query with filter",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"traces","filter":{"expression":"service.name = 'frontend'"}}}]}}`,
			expected: map[string]string{
				"traces": "builder_query/" + whereSegment,
			},
		},
		{
			name: "logs builder query without filter",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs"}}]}}`,
			expected: map[string]string{
				"logs": "builder_query/" + emptyWhereSegment,
			},
		},
		{
			name: "audit logs",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"logs","source":"audit"}}]}}`,
			expected: map[string]string{
				"audit-logs": "builder_query/" + emptyWhereSegment,
			},
		},
		{
			name: "metrics builder query",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"metrics","filter":{"expression":"service.name = 'frontend'"},"aggregations":[{"metricName":"http.server.duration.count"}]}}]}}`,
			expected: map[string]string{
				"metrics": "builder_query/" + metricSegment + "/" + whereSegment,
			},
		},
		{
			name: "meter metrics",
			body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"metrics","source":"meter","aggregations":[{"metricName":"http.server.duration.count"}]}}]}}`,
			expected: map[string]string{
				"meter-metrics": "builder_query/" + metricSegment + "/" + emptyWhereSegment,
			},
		},
		{
			name: "promql",
			body: `{"compositeQuery":{"queries":[{"type":"promql","spec":{"query":"sum(rate(foo[5m]))"}}]}}`,
			expected: map[string]string{
				"metrics": "promql",
			},
		},
		{
			name: "trace operator",
			body: `{"compositeQuery":{"queries":[{"type":"builder_trace_operator","spec":{"expression":"A => B"}}]}}`,
			expected: map[string]string{
				"traces": "builder_trace_operator",
			},
		},
		{
			name: "clickhouse sql fans out to core signals",
			body: `{"compositeQuery":{"queries":[{"type":"clickhouse_sql","spec":{"query":"SELECT 1"}}]}}`,
			expected: map[string]string{
				"logs":    "clickhouse_sql",
				"traces":  "clickhouse_sql",
				"metrics": "clickhouse_sql",
			},
		},
		{
			name: "duplicate queries deduplicated",
			body: `{"compositeQuery":{"queries":[
				{"type":"builder_query","spec":{"signal":"traces","filter":{"expression":"service.name = 'frontend'"}}},
				{"type":"builder_query","spec":{"signal":"traces","filter":{"expression":"service.name = 'frontend'"}}},
				{"type":"builder_formula","spec":{"name":"error_rate","expression":"A / B * 100"}}
			]}}`,
			expected: map[string]string{
				"traces": "builder_query/" + whereSegment,
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			refs, err := QueryRangeResources(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
			require.NoError(t, err)
			require.Len(t, refs, len(testCase.expected))

			actual := make(map[string]string, len(refs))
			for _, ref := range refs {
				actual[ref.Resource.Kind().String()] = ref.ID
			}
			assert.Equal(t, testCase.expected, actual)
		})
	}
}

func TestQueryRangeResourcesErrors(t *testing.T) {
	testCases := []struct {
		name string
		body string
	}{
		{name: "empty body", body: ``},
		{name: "empty object", body: `{}`},
		{name: "empty queries", body: `{"compositeQuery":{"queries":[]}}`},
		{name: "unknown query type", body: `{"compositeQuery":{"queries":[{"type":"magic","spec":{}}]}}`},
		{name: "missing signal", body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{}}]}}`},
		{name: "unknown signal", body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"events"}}]}}`},
		{name: "metrics without aggregations", body: `{"compositeQuery":{"queries":[{"type":"builder_query","spec":{"signal":"metrics"}}]}}`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := QueryRangeResources(coretypes.ExtractorContext{RequestBody: []byte(testCase.body)})
			assert.Error(t, err)
		})
	}
}

func TestQueryRangeResourcesFormulaOnly(t *testing.T) {
	refs, err := QueryRangeResources(coretypes.ExtractorContext{RequestBody: []byte(`{"compositeQuery":{"queries":[{"type":"builder_formula","spec":{"expression":"A / B"}}]}}`)})
	require.NoError(t, err)
	assert.Empty(t, refs)
}
