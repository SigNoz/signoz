package implspanpercentile

import (
	"fmt"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/stretchr/testify/require"
)

func TestSpanPercentileCTEBuilder(t *testing.T) {
	cases := []struct {
		name        string
		request     *spanpercentiletypes.SpanPercentileRequest
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name: "basic span percentile query with default deployment.environment",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID:                  "span123456789abcdef",
				Start:                   1640995200000,
				End:                     1640995800000,
				AdditionalResourceAttrs: []string{"deployment.environment"},
			},
			expected: qbtypes.Statement{
				Query: "WITH target AS (SELECT span_id, duration_nano, name, `resource_string_service$$name` AS service_name, resources_string['deployment.environment'] AS deployment_environment FROM signoz_traces.distributed_signoz_index_v3 WHERE span_id = 'span123456789abcdef' AND timestamp >= '1640995200000000000' AND timestamp < '1640995800000000000' AND ts_bucket_start >= 1640993400 AND ts_bucket_start <= 1640995800 LIMIT 1) SELECT (SELECT span_id FROM target) AS span_id, (SELECT duration_nano FROM target) AS duration_nano, (SELECT duration_nano FROM target) / 1000000.0 AS duration_ms, (SELECT name FROM target) AS span_name, (SELECT service_name FROM target) AS service_name, (SELECT deployment_environment FROM target) AS deployment_environment, quantile(0.5)(s.duration_nano) / 1000000.0 AS p50_duration_ms, quantile(0.9)(s.duration_nano) / 1000000.0 AS p90_duration_ms, quantile(0.99)(s.duration_nano) / 1000000.0 AS p99_duration_ms, round((100.0 * countIf(s.duration_nano <= (SELECT duration_nano FROM target))) / count(), 2) AS percentile_position FROM signoz_traces.distributed_signoz_index_v3 AS s WHERE s.timestamp >= '1640995200000000000' AND s.timestamp < '1640995800000000000' AND s.ts_bucket_start >= 1640993400 AND s.ts_bucket_start <= 1640995800 AND s.name = (SELECT name FROM target) AND `s.resource_string_service$$name` = (SELECT service_name FROM target) AND s.resources_string['deployment.environment'] = (SELECT deployment_environment FROM target) SETTINGS max_threads = 12, min_bytes_to_use_direct_io = 1, use_query_cache = 0, enable_filesystem_cache = 0, use_query_condition_cache = 0",
				Args:  nil,
			},
			expectedErr: nil,
		},
		{
			name: "span percentile query with multiple additional resource attributes",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID:                  "span987654321fedcba",
				Start:                   1640995200000,
				End:                     1640995800000,
				AdditionalResourceAttrs: []string{"deployment.environment", "k8s.cluster.name"},
			},
			expected: qbtypes.Statement{
				Query: "WITH target AS (SELECT span_id, duration_nano, name, `resource_string_service$$name` AS service_name, resources_string['deployment.environment'] AS deployment_environment, resources_string['k8s.cluster.name'] AS k8s_cluster_name FROM signoz_traces.distributed_signoz_index_v3 WHERE span_id = 'span987654321fedcba' AND timestamp >= '1640995200000000000' AND timestamp < '1640995800000000000' AND ts_bucket_start >= 1640993400 AND ts_bucket_start <= 1640995800 LIMIT 1) SELECT (SELECT span_id FROM target) AS span_id, (SELECT duration_nano FROM target) AS duration_nano, (SELECT duration_nano FROM target) / 1000000.0 AS duration_ms, (SELECT name FROM target) AS span_name, (SELECT service_name FROM target) AS service_name, (SELECT deployment_environment FROM target) AS deployment_environment, (SELECT k8s_cluster_name FROM target) AS k8s_cluster_name, quantile(0.5)(s.duration_nano) / 1000000.0 AS p50_duration_ms, quantile(0.9)(s.duration_nano) / 1000000.0 AS p90_duration_ms, quantile(0.99)(s.duration_nano) / 1000000.0 AS p99_duration_ms, round((100.0 * countIf(s.duration_nano <= (SELECT duration_nano FROM target))) / count(), 2) AS percentile_position FROM signoz_traces.distributed_signoz_index_v3 AS s WHERE s.timestamp >= '1640995200000000000' AND s.timestamp < '1640995800000000000' AND s.ts_bucket_start >= 1640993400 AND s.ts_bucket_start <= 1640995800 AND s.name = (SELECT name FROM target) AND `s.resource_string_service$$name` = (SELECT service_name FROM target) AND s.resources_string['deployment.environment'] = (SELECT deployment_environment FROM target) AND s.resources_string['k8s.cluster.name'] = (SELECT k8s_cluster_name FROM target) SETTINGS max_threads = 12, min_bytes_to_use_direct_io = 1, use_query_cache = 0, enable_filesystem_cache = 0, use_query_condition_cache = 0",
				Args:  nil,
			},
			expectedErr: nil,
		},
		{
			name: "span percentile query with no additional attributes (only mandatory name and service.name)",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID:                  "simple-filter-span",
				Start:                   1641081600000,
				End:                     1641085200000,
				AdditionalResourceAttrs: []string{},
			},
			expected: qbtypes.Statement{
				Query: "WITH target AS (SELECT span_id, duration_nano, name, `resource_string_service$$name` AS service_name FROM signoz_traces.distributed_signoz_index_v3 WHERE span_id = 'simple-filter-span' AND timestamp >= '1641081600000000000' AND timestamp < '1641085200000000000' AND ts_bucket_start >= 1641079800 AND ts_bucket_start <= 1641085200 LIMIT 1) SELECT (SELECT span_id FROM target) AS span_id, (SELECT duration_nano FROM target) AS duration_nano, (SELECT duration_nano FROM target) / 1000000.0 AS duration_ms, (SELECT name FROM target) AS span_name, (SELECT service_name FROM target) AS service_name, quantile(0.5)(s.duration_nano) / 1000000.0 AS p50_duration_ms, quantile(0.9)(s.duration_nano) / 1000000.0 AS p90_duration_ms, quantile(0.99)(s.duration_nano) / 1000000.0 AS p99_duration_ms, round((100.0 * countIf(s.duration_nano <= (SELECT duration_nano FROM target))) / count(), 2) AS percentile_position FROM signoz_traces.distributed_signoz_index_v3 AS s WHERE s.timestamp >= '1641081600000000000' AND s.timestamp < '1641085200000000000' AND s.ts_bucket_start >= 1641079800 AND s.ts_bucket_start <= 1641085200 AND s.name = (SELECT name FROM target) AND `s.resource_string_service$$name` = (SELECT service_name FROM target) SETTINGS max_threads = 12, min_bytes_to_use_direct_io = 1, use_query_cache = 0, enable_filesystem_cache = 0, use_query_condition_cache = 0",
				Args:  nil,
			},
			expectedErr: nil,
		},
		{
			name: "span percentile query with longer time range",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID:                  "long-range-span",
				Start:                   1640995200000,
				End:                     1641099600000,
				AdditionalResourceAttrs: []string{"deployment.environment"},
			},
			expected: qbtypes.Statement{
				Query: "WITH target AS (SELECT span_id, duration_nano, name, `resource_string_service$$name` AS service_name, resources_string['deployment.environment'] AS deployment_environment FROM signoz_traces.distributed_signoz_index_v3 WHERE span_id = 'long-range-span' AND timestamp >= '1640995200000000000' AND timestamp < '1641099600000000000' AND ts_bucket_start >= 1640993400 AND ts_bucket_start <= 1641099600 LIMIT 1) SELECT (SELECT span_id FROM target) AS span_id, (SELECT duration_nano FROM target) AS duration_nano, (SELECT duration_nano FROM target) / 1000000.0 AS duration_ms, (SELECT name FROM target) AS span_name, (SELECT service_name FROM target) AS service_name, (SELECT deployment_environment FROM target) AS deployment_environment, quantile(0.5)(s.duration_nano) / 1000000.0 AS p50_duration_ms, quantile(0.9)(s.duration_nano) / 1000000.0 AS p90_duration_ms, quantile(0.99)(s.duration_nano) / 1000000.0 AS p99_duration_ms, round((100.0 * countIf(s.duration_nano <= (SELECT duration_nano FROM target))) / count(), 2) AS percentile_position FROM signoz_traces.distributed_signoz_index_v3 AS s WHERE s.timestamp >= '1640995200000000000' AND s.timestamp < '1641099600000000000' AND s.ts_bucket_start >= 1640993400 AND s.ts_bucket_start <= 1641099600 AND s.name = (SELECT name FROM target) AND `s.resource_string_service$$name` = (SELECT service_name FROM target) AND s.resources_string['deployment.environment'] = (SELECT deployment_environment FROM target) SETTINGS max_threads = 12, min_bytes_to_use_direct_io = 1, use_query_cache = 0, enable_filesystem_cache = 0, use_query_condition_cache = 0",
				Args:  nil,
			},
			expectedErr: nil,
		},
		{
			name: "span percentile query with host.name attribute",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID:                  "host-filter-span",
				Start:                   1641000000000,
				End:                     1641003600000,
				AdditionalResourceAttrs: []string{"host.name"},
			},
			expected: qbtypes.Statement{
				Query: "WITH target AS (SELECT span_id, duration_nano, name, `resource_string_service$$name` AS service_name, resources_string['host.name'] AS host_name FROM signoz_traces.distributed_signoz_index_v3 WHERE span_id = 'host-filter-span' AND timestamp >= '1641000000000000000' AND timestamp < '1641003600000000000' AND ts_bucket_start >= 1640998200 AND ts_bucket_start <= 1641003600 LIMIT 1) SELECT (SELECT span_id FROM target) AS span_id, (SELECT duration_nano FROM target) AS duration_nano, (SELECT duration_nano FROM target) / 1000000.0 AS duration_ms, (SELECT name FROM target) AS span_name, (SELECT service_name FROM target) AS service_name, (SELECT host_name FROM target) AS host_name, quantile(0.5)(s.duration_nano) / 1000000.0 AS p50_duration_ms, quantile(0.9)(s.duration_nano) / 1000000.0 AS p90_duration_ms, quantile(0.99)(s.duration_nano) / 1000000.0 AS p99_duration_ms, round((100.0 * countIf(s.duration_nano <= (SELECT duration_nano FROM target))) / count(), 2) AS percentile_position FROM signoz_traces.distributed_signoz_index_v3 AS s WHERE s.timestamp >= '1641000000000000000' AND s.timestamp < '1641003600000000000' AND s.ts_bucket_start >= 1640998200 AND s.ts_bucket_start <= 1641003600 AND s.name = (SELECT name FROM target) AND `s.resource_string_service$$name` = (SELECT service_name FROM target) AND s.resources_string['host.name'] = (SELECT host_name FROM target) SETTINGS max_threads = 12, min_bytes_to_use_direct_io = 1, use_query_cache = 0, enable_filesystem_cache = 0, use_query_condition_cache = 0",
				Args:  nil,
			},
			expectedErr: nil,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			builder := &spanPercentileCTEBuilder{
				start:                   c.request.Start * 1000000,
				end:                     c.request.End * 1000000,
				spanID:                  c.request.SpanID,
				additionalResourceAttrs: c.request.AdditionalResourceAttrs,
				request:                 c.request,
			}

			stmt := builder.build()

			if c.expectedErr != nil {
				_, err := buildSpanPercentileQuery(c.request)
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.Equal(t, c.expected.Query, stmt.Query)
				require.Equal(t, c.expected.Args, stmt.Args)
			}
		})
	}
}

func TestSpanPercentileCTEBuilderErrors(t *testing.T) {
	cases := []struct {
		name        string
		request     *spanpercentiletypes.SpanPercentileRequest
		expectedErr string
	}{
		{
			name: "empty span ID",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID: "",
				Start:  1640995200000,
				End:    1640995800000,
			},
			expectedErr: "span_id is required",
		},
		{
			name: "invalid time range - start after end",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID: "valid-span-id",
				Start:  1640995800000,
				End:    1640995200000,
			},
			expectedErr: "start time must be before end time",
		},
		{
			name: "empty resource attribute",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID:                  "valid-span-id",
				Start:                   1640995200000,
				End:                     1640995800000,
				AdditionalResourceAttrs: []string{""},
			},
			expectedErr: "resource attribute cannot be empty",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := buildSpanPercentileQuery(c.request)
			require.Error(t, err)
			require.Contains(t, err.Error(), c.expectedErr)
		})
	}
}

func TestSpanPercentileCTEBuilderComponents(t *testing.T) {
	t.Run("test target span CTE generation with additional attributes", func(t *testing.T) {
		builder := &spanPercentileCTEBuilder{
			start:                   1640995200000000000,
			end:                     1640995800000000000,
			spanID:                  "target-span-123",
			additionalResourceAttrs: []string{"deployment.environment", "k8s.namespace"},
		}

		builder.buildTargetSpanCTE()
		require.Len(t, builder.ctes, 1)

		cte := builder.ctes[0]
		require.Equal(t, "target", cte.name)
		require.Contains(t, cte.sql, "SELECT span_id, duration_nano, name, `resource_string_service$$name` AS service_name")
		require.Contains(t, cte.sql, "resources_string['deployment.environment'] AS deployment_environment")
		require.Contains(t, cte.sql, "resources_string['k8s.namespace'] AS k8s_namespace")
		require.Contains(t, cte.sql, "FROM signoz_traces.distributed_signoz_index_v3")
		require.Contains(t, cte.sql, "span_id = 'target-span-123'")
		require.Contains(t, cte.sql, "LIMIT 1")
	})

	t.Run("test target span CTE generation without additional attributes", func(t *testing.T) {
		builder := &spanPercentileCTEBuilder{
			start:                   1640995200000000000,
			end:                     1640995800000000000,
			spanID:                  "target-span-456",
			additionalResourceAttrs: []string{},
		}

		builder.buildTargetSpanCTE()
		require.Len(t, builder.ctes, 1)

		cte := builder.ctes[0]
		require.Equal(t, "target", cte.name)
		require.Contains(t, cte.sql, "SELECT span_id, duration_nano, name, `resource_string_service$$name` AS service_name")
		require.NotContains(t, cte.sql, "deployment.environment")
	})

	t.Run("test main query generation with additional attributes", func(t *testing.T) {
		builder := &spanPercentileCTEBuilder{
			start:                   1640995200000000000,
			end:                     1640995800000000000,
			spanID:                  "main-query-span",
			additionalResourceAttrs: []string{"deployment.environment"},
		}

		query, args := builder.buildMainQuery()

		require.Contains(t, query, "(SELECT span_id FROM target) AS span_id")
		require.Contains(t, query, "(SELECT duration_nano FROM target) AS duration_nano")
		require.Contains(t, query, "(SELECT duration_nano FROM target) / 1000000.0 AS duration_ms")
		require.Contains(t, query, "(SELECT name FROM target) AS span_name")
		require.Contains(t, query, "(SELECT service_name FROM target) AS service_name")
		require.Contains(t, query, "(SELECT deployment_environment FROM target) AS deployment_environment")
		require.Contains(t, query, "round((100.0 * countIf(s.duration_nano <= (SELECT duration_nano FROM target))) / count(), 2) AS percentile_position")
		require.Contains(t, query, "quantile(0.5)(s.duration_nano) / 1000000.0 AS p50_duration_ms")
		require.Contains(t, query, "quantile(0.9)(s.duration_nano) / 1000000.0 AS p90_duration_ms")
		require.Contains(t, query, "quantile(0.99)(s.duration_nano) / 1000000.0 AS p99_duration_ms")

		require.Contains(t, query, "FROM signoz_traces.distributed_signoz_index_v3 AS s")

		require.Contains(t, query, "s.name = (SELECT name FROM target)")
		require.Contains(t, query, "`s.resource_string_service$$name` = (SELECT service_name FROM target)")
		require.Contains(t, query, "s.resources_string['deployment.environment'] = (SELECT deployment_environment FROM target)")

		require.Contains(t, query, "SETTINGS max_threads = 12")

		require.Empty(t, args)
	})

	t.Run("test arg interpolation", func(t *testing.T) {
		builder := &spanPercentileCTEBuilder{}

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
				result := builder.interpolateArgs(tc.sql, tc.args)
				require.Equal(t, tc.expected, result)
			})
		}
	})

	t.Run("test escapeResourceAttr", func(t *testing.T) {
		builder := &spanPercentileCTEBuilder{}

		testCases := []struct {
			input    string
			expected string
		}{
			{"deployment.environment", "deployment_environment"},
			{"k8s.cluster.name", "k8s_cluster_name"},
			{"host.name", "host_name"},
			{"service.name", "service_name"},
			{"simple", "simple"},
		}

		for _, tc := range testCases {
			t.Run(tc.input, func(t *testing.T) {
				result := builder.escapeResourceAttr(tc.input)
				require.Equal(t, tc.expected, result)
			})
		}
	})
}

func TestSpanPercentileTimestampCalculations(t *testing.T) {
	testCases := []struct {
		name                string
		startMs             int64
		endMs               int64
		expectedStartNs     uint64
		expectedEndNs       uint64
		expectedStartBucket uint64
		expectedEndBucket   uint64
	}{
		{
			name:                "basic 10 minute range",
			startMs:             1640995200000,
			endMs:               1640995800000,
			expectedStartNs:     1640995200000000000,
			expectedEndNs:       1640995800000000000,
			expectedStartBucket: 1640993400,
			expectedEndBucket:   1640995800,
		},
		{
			name:                "1 hour range",
			startMs:             1641000000000,
			endMs:               1641003600000,
			expectedStartNs:     1641000000000000000,
			expectedEndNs:       1641003600000000000,
			expectedStartBucket: 1640998200,
			expectedEndBucket:   1641003600,
		},
		{
			name:                "29 hour range",
			startMs:             1640995200000,
			endMs:               1641099600000,
			expectedStartNs:     1640995200000000000,
			expectedEndNs:       1641099600000000000,
			expectedStartBucket: 1640993400,
			expectedEndBucket:   1641099600,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			builder := &spanPercentileCTEBuilder{
				start:  uint64(tc.startMs) * 1000000,
				end:    uint64(tc.endMs) * 1000000,
				spanID: "test-span",
			}

			require.Equal(t, tc.expectedStartNs, builder.start)
			require.Equal(t, tc.expectedEndNs, builder.end)

			stmt := builder.build()

			require.Contains(t, stmt.Query, fmt.Sprintf("%d", tc.expectedStartNs))
			require.Contains(t, stmt.Query, fmt.Sprintf("%d", tc.expectedEndNs))

			require.Contains(t, stmt.Query, fmt.Sprintf("%d", tc.expectedStartBucket))
			require.Contains(t, stmt.Query, fmt.Sprintf("%d", tc.expectedEndBucket))
		})
	}
}
