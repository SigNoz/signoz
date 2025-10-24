package implspanpercentile

import (
	"context"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func createTestResourceFilterBuilder() qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	resourceFilterFieldMapper := resourcefilter.NewFieldMapper()
	resourceFilterConditionBuilder := resourcefilter.NewConditionBuilder(resourceFilterFieldMapper)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()

	mockMetadataStore.KeysMap = map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {
			{
				Name:          "service.name",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"deployment.environment": {
			{
				Name:          "deployment.environment",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"k8s.cluster.name": {
			{
				Name:          "k8s.cluster.name",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"cloud.platform": {
			{
				Name:          "cloud.platform",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
	}

	return resourcefilter.NewTraceResourceFilterStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		resourceFilterFieldMapper,
		resourceFilterConditionBuilder,
		mockMetadataStore,
	)
}

func TestEscapeResourceAttr(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{
			input:    "deployment.environment",
			expected: "deployment_environment",
		},
		{
			input:    "k8s.cluster.name",
			expected: "k8s_cluster_name",
		},
		{
			input:    "host.name",
			expected: "host_name",
		},
		{
			input:    "service.name",
			expected: "service_name",
		},
		{
			input:    "simple",
			expected: "simple",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := escapeResourceAttr(tc.input)
			require.Equal(t, tc.expected, result)
		})
	}
}

func TestInterpolateArgs(t *testing.T) {
	testCases := []struct {
		name     string
		sql      string
		args     []any
		expected string
	}{
		{
			name:     "string interpolation",
			sql:      "SELECT * FROM table WHERE name = ?",
			args:     []any{"test-name"},
			expected: "SELECT * FROM table WHERE name = 'test-name'",
		},
		{
			name:     "string with quotes",
			sql:      "SELECT * FROM table WHERE name = ?",
			args:     []any{"test's name"},
			expected: "SELECT * FROM table WHERE name = 'test''s name'",
		},
		{
			name:     "integer interpolation",
			sql:      "SELECT * FROM table WHERE id = ? AND count > ?",
			args:     []any{123, 456},
			expected: "SELECT * FROM table WHERE id = 123 AND count > 456",
		},
		{
			name:     "mixed types",
			sql:      "SELECT * FROM table WHERE name = ? AND timestamp >= ? AND value = ?",
			args:     []any{"service", uint64(1640995200000), 3.14},
			expected: "SELECT * FROM table WHERE name = 'service' AND timestamp >= 1640995200000 AND value = 3.14",
		},
		{
			name:     "no args",
			sql:      "SELECT * FROM table",
			args:     []any{},
			expected: "SELECT * FROM table",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := interpolateArgs(tc.sql, tc.args)
			require.Equal(t, tc.expected, result)
		})
	}
}

func TestQueryAlwaysUsesResourceFingerprint(t *testing.T) {
	req := &spanpercentiletypes.SpanPercentileRequest{
		DurationNano:       100000,
		Name:               "test",
		ServiceName:        "test-service",
		ResourceAttributes: map[string]string{},
		Start:              1640995200000,
		End:                1640995800000,
	}

	ctx := context.Background()
	resourceFilterBuilder := createTestResourceFilterBuilder()
	result, err := buildSpanPercentileQuery(ctx, req, resourceFilterBuilder)
	require.NoError(t, err)

	chQuery, ok := result.CompositeQuery.Queries[0].Spec.(qbtypes.ClickHouseQuery)
	require.True(t, ok)

	require.Contains(t, chQuery.Query, "__resource_filter AS",
		"Query should contain resource filter CTE")
	require.Contains(t, chQuery.Query, "s.resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)",
		"Query should use resource fingerprint filtering")
}

func TestCompleteQueryWithResourceFingerprinting(t *testing.T) {
	testCases := []struct {
		name          string
		request       *spanpercentiletypes.SpanPercentileRequest
		expectedQuery string
	}{
		{
			name: "query with service.name only (no additional resource attributes)",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano:       100000,
				Name:               "GET /api/users",
				ServiceName:        "user-service",
				ResourceAttributes: map[string]string{},
				Start:              1640995200000,
				End:                1640995800000,
			},
			expectedQuery: `WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE (simpleJSONExtractString(labels, 'service.name') = 'user-service' AND labels LIKE '%service.name%' AND labels LIKE '%service.name":"user-service%') AND seen_at_ts_bucket_start >= 1640993400 AND seen_at_ts_bucket_start <= 1640995800) SELECT 100000 AS duration_nano, 'GET /api/users' AS span_name, 'user-service' AS service_name, quantile(0.5)(s.duration_nano) AS p50_duration_nano, quantile(0.9)(s.duration_nano) AS p90_duration_nano, quantile(0.99)(s.duration_nano) AS p99_duration_nano, round((100.0 * countIf(s.duration_nano <= 100000)) / count(), 2) AS percentile_position FROM signoz_traces.distributed_signoz_index_v3 AS s WHERE s.timestamp >= '1640995200000000000' AND s.timestamp < '1640995800000000000' AND s.ts_bucket_start >= 1640993400 AND s.ts_bucket_start <= 1640995800 AND s.name = 'GET /api/users' AND s.resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000, max_execution_time=10`,
		},
		{
			name: "query with service.name and deployment.environment",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano: 250000,
				Name:         "POST /api/orders",
				ServiceName:  "order-service",
				ResourceAttributes: map[string]string{
					"deployment.environment": "production",
				},
				Start: 1640995200000,
				End:   1640995800000,
			},
			expectedQuery: `WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = 'order-service' AND labels LIKE '%service.name%' AND labels LIKE '%service.name":"order-service%') AND (simpleJSONExtractString(labels, 'deployment.environment') = 'production' AND labels LIKE '%deployment.environment%' AND labels LIKE '%deployment.environment":"production%')) AND seen_at_ts_bucket_start >= 1640993400 AND seen_at_ts_bucket_start <= 1640995800) SELECT 250000 AS duration_nano, 'POST /api/orders' AS span_name, 'order-service' AS service_name, 'production' AS deployment_environment, quantile(0.5)(s.duration_nano) AS p50_duration_nano, quantile(0.9)(s.duration_nano) AS p90_duration_nano, quantile(0.99)(s.duration_nano) AS p99_duration_nano, round((100.0 * countIf(s.duration_nano <= 250000)) / count(), 2) AS percentile_position FROM signoz_traces.distributed_signoz_index_v3 AS s WHERE s.timestamp >= '1640995200000000000' AND s.timestamp < '1640995800000000000' AND s.ts_bucket_start >= 1640993400 AND s.ts_bucket_start <= 1640995800 AND s.name = 'POST /api/orders' AND s.resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000, max_execution_time=10`,
		},
		{
			name: "query with multiple resource attributes",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano: 500000,
				Name:         "DELETE /api/items",
				ServiceName:  "inventory-service",
				ResourceAttributes: map[string]string{
					"cloud.platform":         "aws",
					"deployment.environment": "staging",
					"k8s.cluster.name":       "staging-cluster",
				},
				Start: 1640995200000,
				End:   1640995800000,
			},
			expectedQuery: `WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE ((simpleJSONExtractString(labels, 'service.name') = 'inventory-service' AND labels LIKE '%service.name%' AND labels LIKE '%service.name":"inventory-service%') AND (simpleJSONExtractString(labels, 'cloud.platform') = 'aws' AND labels LIKE '%cloud.platform%' AND labels LIKE '%cloud.platform":"aws%') AND (simpleJSONExtractString(labels, 'deployment.environment') = 'staging' AND labels LIKE '%deployment.environment%' AND labels LIKE '%deployment.environment":"staging%') AND (simpleJSONExtractString(labels, 'k8s.cluster.name') = 'staging-cluster' AND labels LIKE '%k8s.cluster.name%' AND labels LIKE '%k8s.cluster.name":"staging-cluster%')) AND seen_at_ts_bucket_start >= 1640993400 AND seen_at_ts_bucket_start <= 1640995800) SELECT 500000 AS duration_nano, 'DELETE /api/items' AS span_name, 'inventory-service' AS service_name, 'aws' AS cloud_platform, 'staging' AS deployment_environment, 'staging-cluster' AS k8s_cluster_name, quantile(0.5)(s.duration_nano) AS p50_duration_nano, quantile(0.9)(s.duration_nano) AS p90_duration_nano, quantile(0.99)(s.duration_nano) AS p99_duration_nano, round((100.0 * countIf(s.duration_nano <= 500000)) / count(), 2) AS percentile_position FROM signoz_traces.distributed_signoz_index_v3 AS s WHERE s.timestamp >= '1640995200000000000' AND s.timestamp < '1640995800000000000' AND s.ts_bucket_start >= 1640993400 AND s.ts_bucket_start <= 1640995800 AND s.name = 'DELETE /api/items' AND s.resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000, max_execution_time=10`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			resourceFilterBuilder := createTestResourceFilterBuilder()
			result, err := buildSpanPercentileQuery(ctx, tc.request, resourceFilterBuilder)
			require.NoError(t, err)
			require.NotNil(t, result)

			chQuery, ok := result.CompositeQuery.Queries[0].Spec.(qbtypes.ClickHouseQuery)
			require.True(t, ok, "Spec should be ClickHouseQuery type")

			t.Logf("Generated Query:\n%s", chQuery.Query)

			require.Equal(t, tc.expectedQuery, chQuery.Query, "Complete query should match expected structure")
		})
	}
}
