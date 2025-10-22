package implspanpercentile

import (
	"strings"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/stretchr/testify/require"
)

func TestBuildSpanPercentileQuery(t *testing.T) {
	cases := []struct {
		name               string
		request            *spanpercentiletypes.SpanPercentileRequest
		expectedQueryParts []string
		expectedErr        string
	}{
		{
			name: "basic span percentile query with deployment.environment",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano: 206154,
				Name:         "OPTIONS",
				ServiceName:  "analytics-prod-v4",
				ResourceAttributes: map[string]string{
					"deployment.environment": "prod",
				},
				Start: 1640995200000,
				End:   1640995800000,
			},
			expectedQueryParts: []string{
				"206154 AS duration_nano",
				"'OPTIONS' AS span_name",
				"'analytics-prod-v4' AS service_name",
				"'prod' AS deployment_environment",
				"quantile(0.5)(s.duration_nano) AS p50_duration_nano",
				"quantile(0.9)(s.duration_nano) AS p90_duration_nano",
				"quantile(0.99)(s.duration_nano) AS p99_duration_nano",
				"round((100.0 * countIf(s.duration_nano <= 206154)) / count(), 2) AS percentile_position",
				"FROM signoz_traces.distributed_signoz_index_v3 AS s",
				"s.name = 'OPTIONS'",
				"SETTINGS max_threads = 12",
			},
		},
		{
			name: "span percentile query with multiple resource attributes",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano: 150000,
				Name:         "GET /api/users",
				ServiceName:  "api-service",
				ResourceAttributes: map[string]string{
					"deployment.environment": "production",
					"k8s.cluster.name":       "prod-cluster-1",
				},
				Start: 1640995200000,
				End:   1640995800000,
			},
			expectedQueryParts: []string{
				"150000 AS duration_nano",
				"'GET /api/users' AS span_name",
				"'api-service' AS service_name",
				"'production' AS deployment_environment",
				"'prod-cluster-1' AS k8s_cluster_name",
				"s.name = 'GET /api/users'",
			},
		},
		{
			name: "span percentile query with no additional resource attributes",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano:       100000,
				Name:               "POST /api/items",
				ServiceName:        "backend-service",
				ResourceAttributes: map[string]string{},
				Start:              1640995200000,
				End:                1640995800000,
			},
			expectedQueryParts: []string{
				"100000 AS duration_nano",
				"'POST /api/items' AS span_name",
				"'backend-service' AS service_name",
				"s.name = 'POST /api/items'",
			},
		},
		{
			name: "validation error - missing name",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano:       100000,
				Name:               "",
				ServiceName:        "test-service",
				ResourceAttributes: map[string]string{},
				Start:              1640995200000,
				End:                1640995800000,
			},
			expectedErr: "name is required",
		},
		{
			name: "validation error - missing service_name",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano:       100000,
				Name:               "test",
				ServiceName:        "",
				ResourceAttributes: map[string]string{},
				Start:              1640995200000,
				End:                1640995800000,
			},
			expectedErr: "service_name is required",
		},
		{
			name: "validation error - invalid duration",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano:       0,
				Name:               "test",
				ServiceName:        "test-service",
				ResourceAttributes: map[string]string{},
				Start:              1640995200000,
				End:                1640995800000,
			},
			expectedErr: "duration_nano must be greater than 0",
		},
		{
			name: "validation error - invalid time range",
			request: &spanpercentiletypes.SpanPercentileRequest{
				DurationNano:       100000,
				Name:               "test",
				ServiceName:        "test-service",
				ResourceAttributes: map[string]string{},
				Start:              1640995800000,
				End:                1640995200000,
			},
			expectedErr: "start time must be before end time",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := buildSpanPercentileQuery(tc.request)

			if tc.expectedErr != "" {
				require.Error(t, err)
				require.Contains(t, err.Error(), tc.expectedErr)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, result)
			require.Len(t, result.CompositeQuery.Queries, 1)

			chQuery, ok := result.CompositeQuery.Queries[0].Spec.(qbtypes.ClickHouseQuery)
			require.True(t, ok, "Spec should be ClickHouseQuery type")

			for _, part := range tc.expectedQueryParts {
				require.Contains(t, chQuery.Query, part, "Query should contain: %s", part)
			}
		})
	}
}

func TestEscapeSQLString(t *testing.T) {
	testCases := []struct {
		input    string
		expected string
	}{
		{
			input:    "simple string",
			expected: "simple string",
		},
		{
			input:    "string with 'quote'",
			expected: "string with ''quote''",
		},
		{
			input:    "multiple 'quotes' 'here'",
			expected: "multiple ''quotes'' ''here''",
		},
		{
			input:    "no quotes",
			expected: "no quotes",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := escapeSQLString(tc.input)
			require.Equal(t, tc.expected, result)
		})
	}
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

func TestQueryContainsServiceNameMaterializedColumn(t *testing.T) {
	req := &spanpercentiletypes.SpanPercentileRequest{
		DurationNano:       100000,
		Name:               "test",
		ServiceName:        "test-service",
		ResourceAttributes: map[string]string{},
		Start:              1640995200000,
		End:                1640995800000,
	}

	result, err := buildSpanPercentileQuery(req)
	require.NoError(t, err)

	chQuery, ok := result.CompositeQuery.Queries[0].Spec.(qbtypes.ClickHouseQuery)
	require.True(t, ok)

	// Should use materialized column for service.name
	require.True(t,
		strings.Contains(chQuery.Query, "resource_string_service$$name"),
		"Query should use materialized column for service.name")
}
