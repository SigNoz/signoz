package queues

import (
	"fmt"
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	format "go.signoz.io/signoz/pkg/query-service/utils"
)

// generateOverviewSQL builds the ClickHouse SQL query with optional filters.
// If a filter slice is empty, the query does not constrain on that field.
func generateOverviewSQL(start, end int64, item []v3.FilterItem) string {
	// Convert from nanoseconds to float seconds in Go to avoid decimal overflow in ClickHouse
	startSeconds := float64(start) / 1e9
	endSeconds := float64(end) / 1e9

	timeRangeSecs := endSeconds - startSeconds

	tsBucketStart := startSeconds - 1800
	tsBucketEnd := endSeconds

	var whereClauses []string

	whereClauses = append(whereClauses, fmt.Sprintf("timestamp >= toDateTime64(%f, 9)", startSeconds))
	whereClauses = append(whereClauses, fmt.Sprintf("timestamp <= toDateTime64(%f, 9)", endSeconds))

	for _, filter := range item {
		switch filter.Key.Key {
		case "service.name":
			whereClauses = append(whereClauses, fmt.Sprintf("%s IN (%s)", "service_name", format.ClickHouseFormattedValue(filter.Value)))
		case "name":
			whereClauses = append(whereClauses, fmt.Sprintf("%s IN (%s)", "span_name", format.ClickHouseFormattedValue(filter.Value)))
		case "destination":
			whereClauses = append(whereClauses, fmt.Sprintf("%s IN (%s)", "destination", format.ClickHouseFormattedValue(filter.Value)))
		case "queue":
			whereClauses = append(whereClauses, fmt.Sprintf("%s IN (%s)", "messaging_system", format.ClickHouseFormattedValue(filter.Value)))
		case "kind_string":
			whereClauses = append(whereClauses, fmt.Sprintf("%s IN (%s)", "kind_string", format.ClickHouseFormattedValue(filter.Value)))
		}
	}

	// Combine all WHERE clauses with AND
	whereSQL := strings.Join(whereClauses, "\n            AND ")

	if len(whereSQL) > 0 {
		whereSQL = fmt.Sprintf("AND %s", whereSQL)
	}

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
            ts_bucket_start >= toDateTime64(%f, 9)
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
`, tsBucketStart, tsBucketEnd,
		whereSQL, timeRangeSecs,
	)

	return query
}
