package implspanpercentile

import (
	"context"
	"fmt"
	"sort"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

func TestBuildSpanPercentileQuery(t *testing.T) {
	req := &spanpercentiletypes.SpanPercentileRequest{
		DurationNano:       100000,
		Name:               "test",
		ServiceName:        "test-service",
		ResourceAttributes: map[string]string{},
		Start:              1640995200000,
		End:                1640995800000,
	}

	ctx := context.Background()
	result, err := buildSpanPercentileQuery(ctx, req)
	require.NoError(t, err)
	require.NotNil(t, result)

	require.Equal(t, 1, len(result.CompositeQuery.Queries))
	require.Equal(t, qbtypes.QueryTypeBuilder, result.CompositeQuery.Queries[0].Type)

	query, ok := result.CompositeQuery.Queries[0].Spec.(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation])
	require.True(t, ok, "Spec should be QueryBuilderQuery type")

	require.Equal(t, "span_percentile", query.Name)
	require.Equal(t, telemetrytypes.SignalTraces, query.Signal)

	require.Equal(t, 4, len(query.Aggregations))
	require.Equal(t, "p50(duration_nano)", query.Aggregations[0].Expression)
	require.Equal(t, "p50_duration_nano", query.Aggregations[0].Alias)
	require.Equal(t, "p90(duration_nano)", query.Aggregations[1].Expression)
	require.Equal(t, "p90_duration_nano", query.Aggregations[1].Alias)
	require.Equal(t, "p99(duration_nano)", query.Aggregations[2].Expression)
	require.Equal(t, "p99_duration_nano", query.Aggregations[2].Alias)
	require.Equal(t, "(100.0 * countIf(duration_nano <= 100000)) / count()", query.Aggregations[3].Expression)
	require.Equal(t, "percentile_position", query.Aggregations[3].Alias)

	require.NotNil(t, query.Filter)
	require.Equal(t, "service.name = 'test-service' AND name = 'test'", query.Filter.Expression)

	require.Equal(t, 2, len(query.GroupBy))
	require.Equal(t, "service.name", query.GroupBy[0].TelemetryFieldKey.Name)
	require.Equal(t, telemetrytypes.FieldContextResource, query.GroupBy[0].TelemetryFieldKey.FieldContext)
	require.Equal(t, "name", query.GroupBy[1].TelemetryFieldKey.Name)
	require.Equal(t, telemetrytypes.FieldContextSpan, query.GroupBy[1].TelemetryFieldKey.FieldContext)

	require.Equal(t, qbtypes.RequestTypeScalar, result.RequestType)
}

func TestBuildSpanPercentileQueryWithResourceAttributes(t *testing.T) {
	testCases := []struct {
		name               string
		request            *spanpercentiletypes.SpanPercentileRequest
		expectedFilterExpr string
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
			expectedFilterExpr: "service.name = 'user-service' AND name = 'GET /api/users'",
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
			expectedFilterExpr: "service.name = 'order-service' AND name = 'POST /api/orders' AND deployment.environment = 'production'",
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
			expectedFilterExpr: "service.name = 'inventory-service' AND name = 'DELETE /api/items' AND cloud.platform = 'aws' AND deployment.environment = 'staging' AND k8s.cluster.name = 'staging-cluster'",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			result, err := buildSpanPercentileQuery(ctx, tc.request)
			require.NoError(t, err)
			require.NotNil(t, result)

			query, ok := result.CompositeQuery.Queries[0].Spec.(qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation])
			require.True(t, ok, "Spec should be QueryBuilderQuery type")

			require.Equal(t, tc.expectedFilterExpr, query.Filter.Expression)

			require.Equal(t, 4, len(query.Aggregations))
			require.Equal(t, "p50(duration_nano)", query.Aggregations[0].Expression)
			require.Equal(t, "p90(duration_nano)", query.Aggregations[1].Expression)
			require.Equal(t, "p99(duration_nano)", query.Aggregations[2].Expression)
			require.Contains(t, query.Aggregations[3].Expression, fmt.Sprintf("countIf(duration_nano <= %d)", tc.request.DurationNano))

			expectedGroupByCount := 2 + len(tc.request.ResourceAttributes)
			require.Equal(t, expectedGroupByCount, len(query.GroupBy))
			require.Equal(t, "service.name", query.GroupBy[0].TelemetryFieldKey.Name)
			require.Equal(t, "name", query.GroupBy[1].TelemetryFieldKey.Name)

			for i, key := range getSortedKeys(tc.request.ResourceAttributes) {
				require.Equal(t, key, query.GroupBy[2+i].TelemetryFieldKey.Name)
				require.Equal(t, telemetrytypes.FieldContextResource, query.GroupBy[2+i].TelemetryFieldKey.FieldContext)
			}
		})
	}
}

func getSortedKeys(m map[string]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
