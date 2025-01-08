package queues

import (
	"fmt"
	"strings"
)

// generateOverviewSQL builds the ClickHouse SQL query with optional filters.
// If a filter slice is empty, the query does not constrain on that field.
func generateOverviewSQL(start, end int64, filters *QueueFilters) string {
	// Convert from nanoseconds to float seconds in Go to avoid decimal overflow in ClickHouse
	startSeconds := float64(start) / 1e9
	endSeconds := float64(end) / 1e9

	// Compute time range difference in Go
	timeRangeSecs := endSeconds - startSeconds

	// Example ts_bucket boundaries (could be your own logic)
	tsBucketStart := startSeconds - 1800
	tsBucketEnd := endSeconds

	// Build WHERE clauses for optional filters
	// We always require messaging_system IN ('kafka', 'celery'), but
	// we add additional AND conditions only if the slices are non-empty.
	var whereClauses []string

	// Mandatory base filter: show only kafka/celery
	whereClauses = append(whereClauses, "messaging_system IN ('kafka', 'celery')")

	if len(filters.ServiceName) > 0 {
		whereClauses = append(whereClauses, inClause("service_name", filters.ServiceName))
	}
	if len(filters.SpanName) > 0 {
		whereClauses = append(whereClauses, inClause("span_name", filters.SpanName))
	}
	if len(filters.Queue) > 0 {
		// "queue" in the struct refers to the messaging_system in the DB
		whereClauses = append(whereClauses, inClause("messaging_system", filters.Queue))
	}
	if len(filters.Destination) > 0 {
		whereClauses = append(whereClauses, inClause("destination", filters.Destination))
	}
	if len(filters.Kind) > 0 {
		whereClauses = append(whereClauses, inClause("kind_string", filters.Kind))
	}

	// Combine all WHERE clauses with AND
	whereSQL := strings.Join(whereClauses, "\n    AND ")

	if len(whereSQL) > 0 {
		whereSQL = fmt.Sprintf("AND %s", whereSQL)
	}

	// Final query string
	// Note the use of %f for float64 values in fmt.Sprintf
	query := fmt.Sprintf(`
WITH
    processed_traces AS (
        SELECT
            resource_string_service$$name AS service_name,
            name AS span_name,
            CASE
                WHEN attribute_string_messaging$$system != '' THEN attribute_string_messaging$$system
                WHEN (has(attributes_string, 'celery.action') OR has(attributes_string, 'celery.task_name')) THEN 'celery'
                ELSE 'undefined'
            END AS messaging_system,
            kind_string,
            COALESCE(
                NULLIF(attributes_string['messaging.destination.name'], ''),
                NULLIF(attributes_string['messaging.destination'], '')
            ) AS destination,
            durationNano,
            status_code
        FROM signoz_traces.distributed_signoz_index_v3
        WHERE
            timestamp >= toDateTime64(%f, 9)
            AND timestamp <= toDateTime64(%f, 9)
            AND ts_bucket_start >= toDateTime64(%f, 9)
            AND ts_bucket_start <= toDateTime64(%f, 9)
            AND (
                attribute_string_messaging$$system = 'kafka'
                OR has(attributes_string, 'celery.action')
                OR has(attributes_string, 'celery.task_name')
            )
		    %s
    ),
    aggregated_metrics AS (
        SELECT
            service_name,
            span_name,
            messaging_system,
            destination,
            kind_string,
            count(*) AS total_count,
            sumIf(1, status_code = 2) AS error_count,
            quantile(0.95)(durationNano) / 1000000 AS p95_latency -- Convert to ms
        FROM
            processed_traces
        GROUP BY
            service_name,
            span_name,
            messaging_system,
            destination,
            kind_string
    )
SELECT
    aggregated_metrics.service_name,
    aggregated_metrics.span_name,
    aggregated_metrics.messaging_system,
    aggregated_metrics.destination,
    aggregated_metrics.kind_string,
    COALESCE(aggregated_metrics.total_count / %f, 0) AS throughput,
    COALESCE((aggregated_metrics.error_count * 100.0) / aggregated_metrics.total_count, 0) AS error_percentage,
    aggregated_metrics.p95_latency
FROM
    aggregated_metrics
ORDER BY
    aggregated_metrics.service_name,
    aggregated_metrics.span_name;
`,
		startSeconds, endSeconds,
		tsBucketStart, tsBucketEnd,
		whereSQL, timeRangeSecs,
	)

	return query
}

// inClause returns SQL like "fieldName IN ('val1','val2','val3')"
func inClause(fieldName string, values []string) string {
	// Quote and escape each value for safety
	var quoted []string
	for _, v := range values {
		// Simple escape: replace any single quotes in v
		safeVal := strings.ReplaceAll(v, "'", "''")
		quoted = append(quoted, fmt.Sprintf("'%s'", safeVal))
	}
	return fmt.Sprintf("%s IN (%s)", fieldName, strings.Join(quoted, ","))
}
