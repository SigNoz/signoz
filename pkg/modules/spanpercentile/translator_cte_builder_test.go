package spanpercentile

import (
	"fmt"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestSpanPercentileCTEBuilder(t *testing.T) {
	cases := []struct {
		name        string
		request     *spanpercentiletypes.SpanPercentileRequest
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name: "basic span percentile query without filter",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID: "span123456789abcdef",
				Start:  1640995200000, // 2022-01-01 00:00:00 UTC in ms
				End:    1640995800000, // 2022-01-01 00:10:00 UTC in ms
			},
			expected: qbtypes.Statement{
				Query: "WITH base_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= '1640995200000000000' AND timestamp < '1640995800000000000' AND ts_bucket_start >= 1640993400 AND ts_bucket_start <= 1640995800), target_span AS (SELECT duration_nano, name, `service.name` as service_name, resources_string['deployment.environment'] as deployment_environment FROM base_spans WHERE span_id = 'span123456789abcdef' LIMIT 1) SELECT 'span123456789abcdef' as span_id, t.duration_nano, t.duration_nano as duration_ms, t.name as span_name, t.service_name, t.deployment_environment, round((sum(multiIf(s.duration_nano < t.duration_nano, 1, 0)) * 100.0) / count(*), 2) as percentile_position, quantile(0.50)(s.duration_nano) as p50_duration_ms, quantile(0.90)(s.duration_nano) as p90_duration_ms, quantile(0.99)(s.duration_nano) as p99_duration_ms, count(*) as total_spans_in_group FROM target_span t CROSS JOIN base_spans s WHERE s.name = t.name AND s.`service.name` = t.service_name AND s.resources_string['deployment.environment'] = t.deployment_environment GROUP BY t.duration_nano, t.name, t.service_name, t.deployment_environment",
				Args:  nil,
			},
			expectedErr: nil,
		},
		{
			name: "span percentile query with resource filter",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID: "span987654321fedcba",
				Start:  1640995200000, // 2022-01-01 00:00:00 UTC in ms
				End:    1640995800000, // 2022-01-01 00:10:00 UTC in ms
				Filter: &qbtypes.Filter{
					Expression: "simpleJSONExtractString(labels, 'service.name') = 'frontend' AND labels LIKE '%service.name%' AND labels LIKE '%service.name\":\"frontend%'",
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE seen_at_ts_bucket_start >= '1640993400' AND seen_at_ts_bucket_start <= '1640995800' AND (simpleJSONExtractString(labels, 'service.name') = 'frontend' AND labels LIKE '%service.name%' AND labels LIKE '%service.name\":\"frontend%')), base_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= '1640995200000000000' AND timestamp < '1640995800000000000' AND ts_bucket_start >= 1640993400 AND ts_bucket_start <= 1640995800 AND resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)), target_span AS (SELECT duration_nano, name, `service.name` as service_name, resources_string['deployment.environment'] as deployment_environment FROM base_spans WHERE span_id = 'span987654321fedcba' LIMIT 1) SELECT 'span987654321fedcba' as span_id, t.duration_nano, t.duration_nano as duration_ms, t.name as span_name, t.service_name, t.deployment_environment, round((sum(multiIf(s.duration_nano < t.duration_nano, 1, 0)) * 100.0) / count(*), 2) as percentile_position, quantile(0.50)(s.duration_nano) as p50_duration_ms, quantile(0.90)(s.duration_nano) as p90_duration_ms, quantile(0.99)(s.duration_nano) as p99_duration_ms, count(*) as total_spans_in_group FROM target_span t CROSS JOIN base_spans s WHERE s.name = t.name AND s.`service.name` = t.service_name AND s.resources_string['deployment.environment'] = t.deployment_environment GROUP BY t.duration_nano, t.name, t.service_name, t.deployment_environment",
				Args:  nil,
			},
			expectedErr: nil,
		},
		{
			name: "span percentile query with simple resource filter",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID: "simple-filter-span",
				Start:  1641081600000, // 2022-01-02 00:00:00 UTC in ms
				End:    1641085200000, // 2022-01-02 01:00:00 UTC in ms
				Filter: &qbtypes.Filter{
					Expression: "service.name = 'auth-service'",
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE seen_at_ts_bucket_start >= '1641079800' AND seen_at_ts_bucket_start <= '1641085200' AND (service.name = 'auth-service')), base_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= '1641081600000000000' AND timestamp < '1641085200000000000' AND ts_bucket_start >= 1641079800 AND ts_bucket_start <= 1641085200 AND resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)), target_span AS (SELECT duration_nano, name, `service.name` as service_name, resources_string['deployment.environment'] as deployment_environment FROM base_spans WHERE span_id = 'simple-filter-span' LIMIT 1) SELECT 'simple-filter-span' as span_id, t.duration_nano, t.duration_nano as duration_ms, t.name as span_name, t.service_name, t.deployment_environment, round((sum(multiIf(s.duration_nano < t.duration_nano, 1, 0)) * 100.0) / count(*), 2) as percentile_position, quantile(0.50)(s.duration_nano) as p50_duration_ms, quantile(0.90)(s.duration_nano) as p90_duration_ms, quantile(0.99)(s.duration_nano) as p99_duration_ms, count(*) as total_spans_in_group FROM target_span t CROSS JOIN base_spans s WHERE s.name = t.name AND s.`service.name` = t.service_name AND s.resources_string['deployment.environment'] = t.deployment_environment GROUP BY t.duration_nano, t.name, t.service_name, t.deployment_environment",
				Args:  nil,
			},
			expectedErr: nil,
		},
		{
			name: "span percentile query with longer time range",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID: "long-range-span",
				Start:  1640995200000, // 2022-01-01 00:00:00 UTC in ms
				End:    1641099600000, // 2022-01-02 05:00:00 UTC in ms (29 hours)
			},
			expected: qbtypes.Statement{
				Query: "WITH base_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= '1640995200000000000' AND timestamp < '1641099600000000000' AND ts_bucket_start >= 1640993400 AND ts_bucket_start <= 1641099600), target_span AS (SELECT duration_nano, name, `service.name` as service_name, resources_string['deployment.environment'] as deployment_environment FROM base_spans WHERE span_id = 'long-range-span' LIMIT 1) SELECT 'long-range-span' as span_id, t.duration_nano, t.duration_nano as duration_ms, t.name as span_name, t.service_name, t.deployment_environment, round((sum(multiIf(s.duration_nano < t.duration_nano, 1, 0)) * 100.0) / count(*), 2) as percentile_position, quantile(0.50)(s.duration_nano) as p50_duration_ms, quantile(0.90)(s.duration_nano) as p90_duration_ms, quantile(0.99)(s.duration_nano) as p99_duration_ms, count(*) as total_spans_in_group FROM target_span t CROSS JOIN base_spans s WHERE s.name = t.name AND s.`service.name` = t.service_name AND s.resources_string['deployment.environment'] = t.deployment_environment GROUP BY t.duration_nano, t.name, t.service_name, t.deployment_environment",
				Args:  nil,
			},
			expectedErr: nil,
		},
		{
			name: "span percentile query with complex filter expression",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID: "complex-filter-span",
				Start:  1641000000000, // 2022-01-01 01:20:00 UTC in ms
				End:    1641003600000, // 2022-01-01 02:20:00 UTC in ms
				Filter: &qbtypes.Filter{
					Expression: "service.name IN ('frontend', 'backend') AND deployment.environment = 'production'",
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_traces.distributed_traces_v3_resource WHERE seen_at_ts_bucket_start >= '1640998200' AND seen_at_ts_bucket_start <= '1641003600' AND (service.name IN ('frontend', 'backend') AND deployment.environment = 'production')), base_spans AS (SELECT *, resource_string_service$$name AS `service.name` FROM signoz_traces.distributed_signoz_index_v3 WHERE timestamp >= '1641000000000000000' AND timestamp < '1641003600000000000' AND ts_bucket_start >= 1640998200 AND ts_bucket_start <= 1641003600 AND resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)), target_span AS (SELECT duration_nano, name, `service.name` as service_name, resources_string['deployment.environment'] as deployment_environment FROM base_spans WHERE span_id = 'complex-filter-span' LIMIT 1) SELECT 'complex-filter-span' as span_id, t.duration_nano, t.duration_nano as duration_ms, t.name as span_name, t.service_name, t.deployment_environment, round((sum(multiIf(s.duration_nano < t.duration_nano, 1, 0)) * 100.0) / count(*), 2) as percentile_position, quantile(0.50)(s.duration_nano) as p50_duration_ms, quantile(0.90)(s.duration_nano) as p90_duration_ms, quantile(0.99)(s.duration_nano) as p99_duration_ms, count(*) as total_spans_in_group FROM target_span t CROSS JOIN base_spans s WHERE s.name = t.name AND s.`service.name` = t.service_name AND s.resources_string['deployment.environment'] = t.deployment_environment GROUP BY t.duration_nano, t.name, t.service_name, t.deployment_environment",
				Args:  nil,
			},
			expectedErr: nil,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			// Build the CTE builder
			builder := &spanPercentileCTEBuilder{
				start:   c.request.Start * 1000000, // Convert ms to ns
				end:     c.request.End * 1000000,   // Convert ms to ns
				spanID:  c.request.SpanID,
				filter:  c.request.Filter,
				request: c.request,
			}

			stmt := builder.build()

			if c.expectedErr != nil {
				// Since build() no longer returns an error, we should test validation at the request level
				_, err := BuildSpanPercentileQuery(c.request)
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
			name: "empty filter expression",
			request: &spanpercentiletypes.SpanPercentileRequest{
				SpanID: "valid-span-id",
				Start:  1640995200000,
				End:    1640995800000,
				Filter: &qbtypes.Filter{
					Expression: "",
				},
			},
			expectedErr: "filter expression cannot be empty when filter is provided",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := BuildSpanPercentileQuery(c.request)
			require.Error(t, err)
			require.Contains(t, err.Error(), c.expectedErr)
		})
	}
}

func TestSpanPercentileCTEBuilderComponents(t *testing.T) {

	t.Run("test base spans CTE with filter", func(t *testing.T) {
		builder := &spanPercentileCTEBuilder{
			start:  1640995200000000000,
			end:    1640995800000000000,
			spanID: "test-span",
			filter: &qbtypes.Filter{
				Expression: "service.name = 'filtered-service'",
			},
		}

		// First build resource filter
		builder.buildResourceFilterCTE()
		// Then build base spans
		builder.buildBaseSpansCTE()
		require.Len(t, builder.ctes, 2)

		baseSpansCTE := builder.ctes[1]
		require.Equal(t, "base_spans", baseSpansCTE.name)
		require.Contains(t, baseSpansCTE.sql, "resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	})

	t.Run("test target span CTE generation", func(t *testing.T) {
		builder := &spanPercentileCTEBuilder{
			start:  1640995200000000000,
			end:    1640995800000000000,
			spanID: "target-span-123",
		}

		builder.buildTargetSpanCTE()
		require.Len(t, builder.ctes, 1)

		cte := builder.ctes[0]
		require.Equal(t, "target_span", cte.name)
		require.Contains(t, cte.sql, "SELECT duration_nano, name, `service.name` as service_name")
		require.Contains(t, cte.sql, "resources_string['deployment.environment'] as deployment_environment")
		require.Contains(t, cte.sql, "FROM base_spans")
		require.Contains(t, cte.sql, "span_id = 'target-span-123'")
		require.Contains(t, cte.sql, "LIMIT 1")
	})

	t.Run("test main query generation", func(t *testing.T) {
		builder := &spanPercentileCTEBuilder{
			spanID: "main-query-span",
		}

		query, args := builder.buildMainQuery()

		// Verify SELECT clause components
		require.Contains(t, query, "'main-query-span' as span_id")
		require.Contains(t, query, "t.duration_nano")
		require.Contains(t, query, "t.duration_nano as duration_ms")
		require.Contains(t, query, "t.name as span_name")
		require.Contains(t, query, "t.service_name")
		require.Contains(t, query, "t.deployment_environment")
		require.Contains(t, query, "round((sum(multiIf(s.duration_nano < t.duration_nano, 1, 0)) * 100.0) / count(*), 2) as percentile_position")
		require.Contains(t, query, "quantile(0.50)(s.duration_nano) as p50_duration_ms")
		require.Contains(t, query, "quantile(0.90)(s.duration_nano) as p90_duration_ms")
		require.Contains(t, query, "quantile(0.99)(s.duration_nano) as p99_duration_ms")
		require.Contains(t, query, "count(*) as total_spans_in_group")

		// Verify FROM and JOIN
		require.Contains(t, query, "FROM target_span t")
		require.Contains(t, query, "CROSS JOIN base_spans s")

		// Verify WHERE conditions
		require.Contains(t, query, "s.name = t.name")
		require.Contains(t, query, "s.`service.name` = t.service_name")
		require.Contains(t, query, "s.resources_string['deployment.environment'] = t.deployment_environment")

		// Verify GROUP BY
		require.Contains(t, query, "GROUP BY t.duration_nano, t.name, t.service_name, t.deployment_environment")

		// Args should be empty since this method doesn't use parameterized queries
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
			startMs:             1640995200000, // 2022-01-01 00:00:00 UTC
			endMs:               1640995800000, // 2022-01-01 00:10:00 UTC
			expectedStartNs:     1640995200000000000,
			expectedEndNs:       1640995800000000000,
			expectedStartBucket: 1640993400, // 1640995200 - 1800
			expectedEndBucket:   1640995800,
		},
		{
			name:                "1 hour range",
			startMs:             1641000000000, // 2022-01-01 01:20:00 UTC
			endMs:               1641003600000, // 2022-01-01 02:20:00 UTC
			expectedStartNs:     1641000000000000000,
			expectedEndNs:       1641003600000000000,
			expectedStartBucket: 1640998200, // 1641000000 - 1800
			expectedEndBucket:   1641003600,
		},
		{
			name:                "29 hour range",
			startMs:             1640995200000, // 2022-01-01 00:00:00 UTC
			endMs:               1641099600000, // 2022-01-02 05:00:00 UTC
			expectedStartNs:     1640995200000000000,
			expectedEndNs:       1641099600000000000,
			expectedStartBucket: 1640993400, // 1640995200 - 1800
			expectedEndBucket:   1641099600,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			builder := &spanPercentileCTEBuilder{
				start:  uint64(tc.startMs) * 1000000, // Convert ms to ns
				end:    uint64(tc.endMs) * 1000000,   // Convert ms to ns
				spanID: "test-span",
			}

			// Test that the calculated values match expected
			require.Equal(t, tc.expectedStartNs, builder.start)
			require.Equal(t, tc.expectedEndNs, builder.end)

			// Build and verify the generated SQL contains correct timestamps
			stmt := builder.build()

			// Check nanosecond timestamps in query
			require.Contains(t, stmt.Query, fmt.Sprintf("%d", tc.expectedStartNs))
			require.Contains(t, stmt.Query, fmt.Sprintf("%d", tc.expectedEndNs))

			// Check bucket timestamps in query
			require.Contains(t, stmt.Query, fmt.Sprintf("%d", tc.expectedStartBucket))
			require.Contains(t, stmt.Query, fmt.Sprintf("%d", tc.expectedEndBucket))
		})
	}
}
