package queues

import (
    "fmt"
    "strings"

    v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
    format "github.com/SigNoz/signoz/pkg/query-service/utils"
)

// generateOverviewSQL builds the ClickHouse SQL query with optional filters
// across supported messaging queue systems (Kafka, Celery, AWS SQS, Google Pub/Sub, AWS Kinesis, and Redis).
func generateOverviewSQL(start, end int64, item []v3.FilterItem) string {
    // Convert from nanoseconds to float seconds in Go to avoid decimal overflow in ClickHouse
    startSeconds := float64(start) / 1e9
    endSeconds := float64(end) / 1e9

    timeRangeSecs := endSeconds - startSeconds

    tsBucketStart := startSeconds - 1800
    tsBucketEnd := endSeconds

    var whereClauses []string
    var postClauses []string

    whereClauses = append(whereClauses, fmt.Sprintf("timestamp >= toDateTime64(%f, 9)", startSeconds))
    whereClauses = append(whereClauses, fmt.Sprintf("timestamp <= toDateTime64(%f, 9)", endSeconds))

    for _, filter := range item {
        switch filter.Key.Key {
        case "service.name":
            whereClauses = append(whereClauses, fmt.Sprintf("%s IN (%s)", "service_name", format.ClickHouseFormattedValue(filter.Value)))
        case "name":
            whereClauses = append(whereClauses, fmt.Sprintf("%s IN (%s)", "span_name", format.ClickHouseFormattedValue(filter.Value)))
        case "destination":
            postClauses = append(postClauses, fmt.Sprintf("%s IN (%s)", "destination", format.ClickHouseFormattedValue(filter.Value)))
        case "queue":
            canonicalVal := NormalizeQueueSystem(fmt.Sprintf("%v", filter.Value))
            expanded := ExpandQueueSystemAliases(filter.Value)
            postClauses = append(postClauses, fmt.Sprintf("(messaging_system = %s OR raw_messaging_system IN (%s))", format.ClickHouseFormattedValue(canonicalVal), format.ClickHouseFormattedValue(expanded)))
        case "kind_string":
            whereClauses = append(whereClauses, fmt.Sprintf("%s IN (%s)", "kind_string", format.ClickHouseFormattedValue(filter.Value)))
        }
    }

    whereSQL := strings.Join(whereClauses, "\n            AND ")
    if len(whereSQL) > 0 {
        whereSQL = fmt.Sprintf("AND %s", whereSQL)
    }

    postFilterSQL := ""
    if len(postClauses) > 0 {
        postFilterSQL = "WHERE " + strings.Join(postClauses, " AND ")
    }

    query := fmt.Sprintf(`
WITH
    processed_traces AS (
        SELECT
            resource_string_service$$name AS service_name,
            name AS span_name,
            lower(attribute_string_messaging$$system) AS raw_messaging_system,
            CASE
                WHEN lower(attribute_string_messaging$$system) IN ('aws_sqs', 'sqs', 'aws.sqs', 'amazonsqs') OR has(attributes_string, 'aws.sqs.queue.name') OR has(attributes_string, 'aws.sqs.queue_url') THEN 'aws_sqs'
                WHEN lower(attribute_string_messaging$$system) IN ('gcp_pubsub', 'pubsub', 'googlecloudpubsub', 'gcp.pubsub', 'google_pubsub') OR has(attributes_string, 'pubsub.topic') OR has(attributes_string, 'gcp.pubsub.topic') THEN 'gcp_pubsub'
                WHEN lower(attribute_string_messaging$$system) IN ('aws_kinesis', 'kinesis', 'aws.kinesis', 'amazonkinesis') OR has(attributes_string, 'aws.kinesis.stream_name') OR has(attributes_string, 'kinesis.stream.name') THEN 'aws_kinesis'
                WHEN lower(attribute_string_messaging$$system) IN ('redis', 'redis_streams', 'redis.streams') OR lower(attributes_string['db.system']) = 'redis' OR has(attributes_string, 'redis.stream') THEN 'redis'
                WHEN (has(attributes_string, 'celery.action') OR has(attributes_string, 'celery.task_name')) THEN 'celery'
                WHEN attribute_string_messaging$$system != '' THEN lower(attribute_string_messaging$$system)
                ELSE 'undefined'
            END AS messaging_system,
            kind_string,
            COALESCE(
                NULLIF(attributes_string['messaging.destination.name'], ''),
                NULLIF(attributes_string['messaging.destination'], ''),
                NULLIF(attributes_string['aws.sqs.queue.name'], ''),
                NULLIF(attributes_string['pubsub.topic'], ''),
                NULLIF(attributes_string['gcp.pubsub.topic'], ''),
                NULLIF(attributes_string['aws.kinesis.stream_name'], ''),
                NULLIF(attributes_string['kinesis.stream.name'], ''),
                NULLIF(attributes_string['redis.stream'], ''),
                NULLIF(attributes_string['celery.task_name'], '')
            ) AS destination,
            durationNano,
            status_code
        FROM signoz_traces.distributed_signoz_index_v3
        WHERE
            ts_bucket_start >= toDateTime64(%f, 9)
            AND ts_bucket_start <= toDateTime64(%f, 9)
            AND (
                lower(attribute_string_messaging$$system) IN (
                    'kafka', 'apache_kafka',
                    'aws_sqs', 'sqs', 'aws.sqs', 'amazonsqs',
                    'gcp_pubsub', 'pubsub', 'googlecloudpubsub', 'gcp.pubsub', 'google_pubsub',
                    'aws_kinesis', 'kinesis', 'aws.kinesis', 'amazonkinesis',
                    'redis', 'redis_streams', 'redis.streams'
                )
                OR lower(attributes_string['db.system']) = 'redis'
                OR has(attributes_string, 'aws.sqs.queue.name')
                OR has(attributes_string, 'aws.sqs.queue_url')
                OR has(attributes_string, 'pubsub.topic')
                OR has(attributes_string, 'gcp.pubsub.topic')
                OR has(attributes_string, 'aws.kinesis.stream_name')
                OR has(attributes_string, 'kinesis.stream.name')
                OR has(attributes_string, 'redis.stream')
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
        %s
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
        whereSQL, postFilterSQL, timeRangeSecs,
    )

    return query
}