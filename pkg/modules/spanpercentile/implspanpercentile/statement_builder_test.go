package implspanpercentile

import (
	"context"
	"fmt"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/require"
)

func TestEscapeSQLString(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "string without quotes",
			input:    "test-name",
			expected: "test-name",
		},
		{
			name:     "string with single quote",
			input:    "test's name",
			expected: "test''s name",
		},
		{
			name:     "string with multiple quotes",
			input:    "it's a 'test'",
			expected: "it''s a ''test''",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := escapeSQLString(tc.input)
			require.Equal(t, tc.expected, result)
		})
	}
}

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

	require.Equal(t, 4, len(query.Aggregations))
	require.Equal(t, "p50_duration_nano", query.Aggregations[0].Alias)
	require.Equal(t, "p90_duration_nano", query.Aggregations[1].Alias)
	require.Equal(t, "p99_duration_nano", query.Aggregations[2].Alias)
	require.Equal(t, "percentile_position", query.Aggregations[3].Alias)

	require.Contains(t, query.Filter.Expression, "service.name = 'test-service'")
	require.Contains(t, query.Filter.Expression, "name = 'test'")

	require.Equal(t, telemetrytypes.SignalTraces, query.Signal)
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
			require.Contains(t, query.Aggregations[3].Expression, fmt.Sprintf("countIf(duration_nano <= %d)", tc.request.DurationNano))
		})
	}
}
