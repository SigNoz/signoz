package resourcefilter

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func buildTestFieldKeyMap(signal telemetrytypes.Signal) map[string][]*telemetrytypes.TelemetryFieldKey {
	keysMap := map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {
			{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"k8s.namespace.name": {
			{
				Name:          "k8s.namespace.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"k8s.deployment.name": {
			{
				Name:          "k8s.deployment.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"env": {
			{
				Name:          "env",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.request.method": {
			{
				Name:          "http.request.method",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"deployment.environment": {
			{
				Name:          "deployment.environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"host.name": {
			{
				Name:          "host.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		// Attribute fields for complex filter test
		"severity_text": {
			{
				Name:          "severity_text",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"body": {
			{
				Name:          "body",
				FieldContext:  telemetrytypes.FieldContextBody,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
	}
	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = signal
		}
	}
	return keysMap
}

// Test constants - values are in nanoseconds as expected by the resource filter builder
const (
	// 1747947419000000000 ns = 1747947419 seconds
	testStartNs = uint64(1747947419000000000)
	// 1747983448000000000 ns = 1747983448 seconds
	testEndNs = uint64(1747983448000000000)
	// Expected bucket start = 1747947419 - 1800 = 1747945619
	expectedBucketStart = uint64(1747945619)
	// Expected bucket end = 1747983448
	expectedBucketEnd = uint64(1747983448)
)

func TestResourceFilterStatementBuilder_Traces(t *testing.T) {
	cases := []struct {
		name        string
		query       qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
		start       uint64
		end         uint64
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name: "simple resource filter with service.name",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with multiple conditions AND",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual' AND k8s.namespace.name = 'production'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND (simpleJSONExtractString(labels, 'k8s.namespace.name') = ? AND labels LIKE ? AND labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", "production", "%k8s.namespace.name%", "%k8s.namespace.name\":\"production%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with OR condition - resource and attribute",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual' OR http.request.method = 'GET'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with empty filter expression",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with nil filter",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: nil,
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with LIKE operator",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name LIKE 'redis%'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (LOWER(simpleJSONExtractString(labels, 'service.name')) LIKE LOWER(?) AND labels LIKE ? AND LOWER(labels) LIKE LOWER(?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis%", "%service.name%", "%service.name%redis%%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with EXISTS operator",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name EXISTS",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONHas(labels, 'service.name') = ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{true, "%service.name%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with NOT EXISTS operator",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name NOT EXISTS",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONHas(labels, 'service.name') <> ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{true, expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with IN operator",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name IN ('redis', 'postgres')",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = ? OR simpleJSONExtractString(labels, 'service.name') = ?) AND labels LIKE ? AND (labels LIKE ? OR labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis", "postgres", "%service.name%", "%service.name\":\"redis%", "%service.name\":\"postgres%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with NOT IN operator",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name NOT IN ('redis', 'postgres')",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE ((simpleJSONExtractString(labels, 'service.name') <> ? AND simpleJSONExtractString(labels, 'service.name') <> ?) AND (labels NOT LIKE ? AND labels NOT LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis", "postgres", "%service.name\":\"redis%", "%service.name\":\"postgres%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with CONTAINS operator",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name CONTAINS 'redis'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (LOWER(simpleJSONExtractString(labels, 'service.name')) LIKE LOWER(?) AND labels LIKE ? AND LOWER(labels) LIKE LOWER(?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"%redis%", "%service.name%", "%service.name%redis%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with REGEXP operator",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name REGEXP 'redis.*'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (match(simpleJSONExtractString(labels, 'service.name'), ?) AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis.*", "%service.name%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with NOT operator for equality",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name != 'redis'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') <> ? AND labels NOT LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis", "%service.name\":\"redis%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with attribute-only filter (should return true)",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "http.request.method = 'POST'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with zero end time",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis'",
				},
			},
			start: testStartNs,
			end:   0,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ?",
				Args:  []any{"redis", "%service.name%", "%service.name\":\"redis%", expectedBucketStart},
			},
		},
		{
			name: "resource filter with NOT and inner expression",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "NOT (service.name = 'redis')",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE NOT (((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?))) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis", "%service.name%", "%service.name\":\"redis%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "attribute filter with NOT and inner expression",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					// http.request.method is an attribute field, not a resource field
					// so the condition returns "true", and NOT should also return "true" (not "NOT (true)")
					Expression: "NOT (http.request.method = 'GET')",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildTestFieldKeyMap(telemetrytypes.SignalTraces)

	builder := NewTraceResourceFilterStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		fm,
		cb,
		mockMetadataStore,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			stmt, err := builder.Build(context.Background(), c.start, c.end, qbtypes.RequestTypeTimeSeries, c.query, nil)

			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, stmt.Query)
				require.Equal(t, c.expected.Args, stmt.Args)
			}
		})
	}
}

func TestResourceFilterStatementBuilder_Logs(t *testing.T) {
	cases := []struct {
		name        string
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		start       uint64
		end         uint64
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name: "simple resource filter with service.name for logs",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis-manual'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with nil filter for logs",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: nil,
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with empty filter expression for logs",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "resource filter with multiple conditions for logs",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'redis' AND k8s.namespace.name = 'default'",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND (simpleJSONExtractString(labels, 'k8s.namespace.name') = ? AND labels LIKE ? AND labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis", "%service.name%", "%service.name\":\"redis%", "default", "%k8s.namespace.name%", "%k8s.namespace.name\":\"default%", expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "complex resource filter with mixed conditions for logs",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{
					// env and k8s.deployment.name are resource fields
					// severity_text is an attribute field (returns true)
					// Multiple grouped conditions with attribute fields
					Expression: "env = 'prod' AND k8s.deployment.name = 'fnscrapers' AND severity_text = 'ERROR' AND severity_text = 'WARN' AND (severity_text = 'INFO' AND severity_text = 'DEBUG') AND (severity_text = 'TRACE' AND severity_text = 'FATAL') AND (severity_text = 'a' AND severity_text = 'b') AND (severity_text = 'c' AND severity_text = 'd') AND (severity_text = 'e' AND severity_text = 'f')",
				},
			},
			start: uint64(1769976178000000000), // These will give bucket start 1769974378 and end 1770062578
			end:   uint64(1770062578000000000),
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE ((simpleJSONExtractString(labels, 'env') = ? AND labels LIKE ? AND labels LIKE ?) AND (simpleJSONExtractString(labels, 'k8s.deployment.name') = ? AND labels LIKE ? AND labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"prod", "%env%", "%env\":\"prod%", "fnscrapers", "%k8s.deployment.name%", "%k8s.deployment.name\":\"fnscrapers%", uint64(1769974378), uint64(1770062578)},
			},
		},
				{
			name: "NOT with unknown key should not generate not()",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					// unknown.key is not in the metadata store, so with IgnoreNotFoundKeys=true
					// the condition returns empty, and NOT should also return empty (not "not()")
					Expression: "NOT (unknown.key = 'value')",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "NOT EQUAL with unknown key should not generate not()",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					// unknown.key is not in the metadata store, so with IgnoreNotFoundKeys=true
					// the condition returns empty, and NOT should also return empty (not "not()")
					Expression: "not(unknown.key = 'value1' and unknown.key = 'value2')",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "NOT with attribute field should not generate NOT (true)",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					// http.request.method is an attribute field, not a resource field
					// so the condition returns "true", and NOT should also return "true" (not "NOT (true)")
					Expression: "not(http.request.method = 'POST')",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
		{
			name: "NOT with multiple attribute fields should not generate NOT (true and true)",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					// http.request.method is an attribute field, not a resource field
					// so the condition returns "true", and NOT should also return "true" (not "NOT (true)")
					Expression: "not(http.request.method = 'POST' and http.request.method = 'GET')",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{expectedBucketStart, expectedBucketEnd},
			},
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildTestFieldKeyMap(telemetrytypes.SignalLogs)

	builder := NewLogResourceFilterStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		fm,
		cb,
		mockMetadataStore,
		nil,
		nil,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			stmt, err := builder.Build(context.Background(), c.start, c.end, qbtypes.RequestTypeTimeSeries, c.query, nil)

			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, stmt.Query)
				require.Equal(t, c.expected.Args, stmt.Args)
			}
		})
	}
}

func TestResourceFilterStatementBuilder_Variables(t *testing.T) {
	cases := []struct {
		name        string
		query       qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]
		variables   map[string]qbtypes.VariableItem
		start       uint64
		end         uint64
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name: "resource filter with variable substitution",
			query: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{
					Expression: "service.name = $service_name",
				},
			},
			variables: map[string]qbtypes.VariableItem{
				"service_name": {
					Value: "redis-manual",
				},
			},
			start: testStartNs,
			end:   testEndNs,
			expected: qbtypes.Statement{
				Query: "SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?",
				Args:  []any{"redis-manual", "%service.name%", "%service.name\":\"redis-manual%", expectedBucketStart, expectedBucketEnd},
			},
		},
	}

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = buildTestFieldKeyMap(telemetrytypes.SignalTraces)

	builder := NewTraceResourceFilterStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		fm,
		cb,
		mockMetadataStore,
	)

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			stmt, err := builder.Build(context.Background(), c.start, c.end, qbtypes.RequestTypeTimeSeries, c.query, c.variables)

			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, stmt.Query)
				require.Equal(t, c.expected.Args, stmt.Args)
			}
		})
	}
}
