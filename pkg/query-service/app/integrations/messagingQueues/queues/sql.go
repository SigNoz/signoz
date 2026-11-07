package queues

import (
	"fmt"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	format "github.com/SigNoz/signoz/pkg/query-service/utils"
)

// filterColumnByKey maps incoming API filter keys to the projected column aliases
// exposed by the processed_traces CTE in ClickHouse.
var filterColumnByKey = map[string]string{
	"service.name": "service_name",
	"name":         "span_name",
	"destination":  "destination",
	"queue":        "messaging_system",
	"kind_string":  "kind_string",
}

// normalizeQueueFilterValue canonicalizes queue system filter values across string
// and slice representations before ClickHouse IN-clause formatting.
func normalizeQueueFilterValue(raw interface{}) interface{} {
	switch typed := raw.(type) {
	case string:
		return NormalizeQueueSystem(typed)
	case []string:
		return NormalizeQueueSystems(typed)
	case []interface{}:
		strSlice := make([]string, 0, len(typed))
		for _, elem := range typed {
			strSlice = append(strSlice, fmt.Sprintf("%v", elem))
		}
		return NormalizeQueueSystems(strSlice)
	default:
		return raw
	}
}

// buildFilterClause translates a single API filter item into a ClickHouse IN predicate
// targeting the projected processed_traces column.
func buildFilterClause(filter v3.FilterItem) string {
	column, ok := filterColumnByKey[filter.Key.Key]
	if !ok {
		return ""
	}
	filterValue := filter.Value
	if filter.Key.Key == "queue" {
		filterValue = normalizeQueueFilterValue(filterValue)
	}
	return fmt.Sprintf("%s IN (%s)", column, format.ClickHouseFormattedValue(filterValue))
}

// buildWhereSQL combines timestamp bounds and optional user filter clauses into
// the ClickHouse WHERE fragment for the processed_traces CTE.
func buildWhereSQL(startSeconds, endSeconds float64, items []v3.FilterItem) string {
	whereClauses := []string{
		fmt.Sprintf("timestamp >= toDateTime64(%f, 9)", startSeconds),
		fmt.Sprintf("timestamp <= toDateTime64(%f, 9)", endSeconds),
	}

	for _, filter := range items {
		clause := buildFilterClause(filter)
		if clause != "" {
			whereClauses = append(whereClauses, clause)
		}
	}

	joined := strings.Join(whereClauses, "\n            AND ")
	return fmt.Sprintf("AND %s", joined)
}

// messagingSystemCaseSQL returns the ClickHouse CASE expression that resolves
// OpenTelemetry span attributes into canonical queue provider identifiers.
func messagingSystemCaseSQL() string {
	return `CASE
                WHEN lower(attribute_string_messaging$$system) IN ('aws_sqs', 'sqs', 'aws.sqs', 'amazonsqs')
                    OR attributes_string['rpc.service'] IN ('SQS', 'AmazonSQS')
                    OR has(attributes_string, 'aws.sqs.queue.name') THEN 'aws_sqs'
                WHEN lower(attribute_string_messaging$$system) IN ('gcp_pubsub', 'pubsub', 'googlecloudpubsub', 'gcp.pubsub') THEN 'gcp_pubsub'
                WHEN lower(attribute_string_messaging$$system) IN ('aws_kinesis', 'kinesis', 'aws.kinesis', 'amazonkinesis')
                    OR attributes_string['rpc.service'] = 'Kinesis'
                    OR has(attributes_string, 'aws.kinesis.stream.name') THEN 'aws_kinesis'
                WHEN lower(attribute_string_messaging$$system) = 'redis'
                    OR attribute_string_db$$system = 'redis'
                    OR attributes_string['db.system'] = 'redis' THEN 'redis'
                WHEN lower(attribute_string_messaging$$system) = 'celery'
                    OR has(attributes_string, 'celery.action')
                    OR has(attributes_string, 'celery.task_name') THEN 'celery'
                WHEN attribute_string_messaging$$system != '' THEN lower(attribute_string_messaging$$system)
                ELSE 'undefined'
            END`
}

// destinationCoalesceSQL returns the ClickHouse COALESCE expression that extracts
// the queue, topic, stream, or database destination across supported queue systems.
func destinationCoalesceSQL() string {
	return `COALESCE(
                NULLIF(attributes_string['messaging.destination.name'], ''),
                NULLIF(attributes_string['messaging.destination'], ''),
                NULLIF(attributes_string['aws.sqs.queue.name'], ''),
                NULLIF(attributes_string['aws.kinesis.stream.name'], ''),
                NULLIF(attributes_string['celery.task_name'], ''),
                NULLIF(attributes_string['db.redis.database_index'], '')
            )`
}

// queueEligibilityWhereSQL returns the ClickHouse predicate that selects spans
// belonging to Kafka, Celery, AWS SQS, Google Pub/Sub, AWS Kinesis, Redis, or
// any other OpenTelemetry-instrumented messaging system.
func queueEligibilityWhereSQL() string {
	return `(
                attribute_string_messaging$$system != ''
                OR has(attributes_string, 'celery.action')
                OR has(attributes_string, 'celery.task_name')
                OR attributes_string['rpc.service'] IN ('SQS', 'AmazonSQS', 'Kinesis')
                OR has(attributes_string, 'aws.sqs.queue.name')
                OR has(attributes_string, 'aws.kinesis.stream.name')
                OR attribute_string_db$$system = 'redis'
                OR attributes_string['db.system'] = 'redis'
            )`
}

// generateOverviewSQL builds the ClickHouse SQL query with optional filters
// across all supported messaging queue systems.
func generateOverviewSQL(start, end int64, item []v3.FilterItem) string {
	// Convert from nanoseconds to float seconds in Go to avoid decimal overflow in ClickHouse.
	startSeconds := float64(start) / 1e9
	endSeconds := float64(end) / 1e9

	timeRangeSecs := endSeconds - startSeconds
	tsBucketStart := startSeconds - 1800
	tsBucketEnd := endSeconds

	whereSQL := buildWhereSQL(startSeconds, endSeconds, item)

	query := fmt.Sprintf(`
WITH
    processed_traces AS (
        SELECT
            resource_string_service$$name AS service_name,
            name AS span_name,
            %s AS messaging_system,
            kind_string,
            %s AS destination,
            durationNano,
            status_code
        FROM signoz_traces.distributed_signoz_index_v3
        WHERE
            ts_bucket_start >= toDateTime64(%f, 9)
            AND ts_bucket_start <= toDateTime64(%f, 9)
            AND %s
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
		messagingSystemCaseSQL(),
		destinationCoalesceSQL(),
		tsBucketStart,
		tsBucketEnd,
		queueEligibilityWhereSQL(),
		whereSQL,
		timeRangeSecs,
	)

	return query
}
