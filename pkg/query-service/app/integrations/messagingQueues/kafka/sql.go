package kafka

import (
	"fmt"
)

func generateConsumerSQL(start, end int64, topic, partition, consumerGroup, queueType string) string {
	timeRange := (end - start) / 1000000000
	query := fmt.Sprintf(`
WITH consumer_query AS (
    SELECT
        serviceName,
        quantile(0.99)(durationNano) / 1000000 AS p99,
        COUNT(*) AS total_requests,
        SUM(CASE WHEN statusCode = 2 THEN 1 ELSE 0 END) AS error_count,
        avg(CASE WHEN has(numberTagMap, 'messaging.message.body.size') THEN numberTagMap['messaging.message.body.size'] ELSE NULL END) AS avg_msg_size
    FROM signoz_traces.distributed_signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 5
        AND msgSystem = '%s'
        AND stringTagMap['messaging.destination.name'] = '%s'
        AND stringTagMap['messaging.destination.partition.id'] = '%s'
        AND stringTagMap['messaging.kafka.consumer.group'] = '%s'
    GROUP BY serviceName
)

-- Main query to select all metrics
SELECT
    serviceName AS service_name,
    p99,
    COALESCE((error_count * 100.0) / total_requests, 0) AS error_rate,
    COALESCE(total_requests / %d, 0) AS throughput,  -- Convert nanoseconds to seconds
    COALESCE(avg_msg_size, 0) AS avg_msg_size
FROM
    consumer_query
ORDER BY
    serviceName;
`, start, end, queueType, topic, partition, consumerGroup, timeRange)
	return query
}

func generateProducerSQL(start, end int64, topic, partition, queueType string) string {
	timeRange := (end - start) / 1000000000
	query := fmt.Sprintf(`
WITH producer_query AS (
    SELECT
        serviceName,
        quantile(0.99)(durationNano) / 1000000 AS p99,
        count(*) AS total_count,
        SUM(CASE WHEN statusCode = 2 THEN 1 ELSE 0 END) AS error_count
    FROM signoz_traces.distributed_signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 4
        AND msgSystem = '%s'
        AND stringTagMap['messaging.destination.name'] = '%s'
        AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY serviceName
)

SELECT
    serviceName AS service_name,
    p99,
    COALESCE((error_count * 100.0) / total_count, 0) AS error_percentage,
    COALESCE(total_count / %d, 0) AS rps  -- Convert nanoseconds to seconds
FROM
    producer_query
ORDER BY
    serviceName;

`, start, end, queueType, topic, partition, timeRange)
	return query
}

func generateNetworkLatencyThroughputSQL(start, end int64, consumerGroup, queueType string) string {
	query := fmt.Sprintf(`
--- Subquery for RPS calculation, desc sorted by rps
SELECT
    stringTagMap['messaging.client_id'] AS client_id,
	stringTagMap['service.instance.id'] AS service_instance_id,
    serviceName AS service_name,
    count(*) / ((%d - %d) / 1000000000) AS rps  -- Convert nanoseconds to seconds
FROM signoz_traces.signoz_index_v2
WHERE
    timestamp >= '%d'
    AND timestamp <= '%d'
    AND kind = 5
    AND msgSystem = '%s' 
    AND stringTagMap['messaging.kafka.consumer.group'] = '%s'
GROUP BY service_name, client_id, service_instance_id
ORDER BY rps DESC
`, end, start, start, end, queueType, consumerGroup)
	return query
}

func generateNetworkLatencyFetchSQL(step, start, end int64, clientId, serviceName string) string {
	query := fmt.Sprintf(`
--- metrics aggregation, desc sorted by value
WITH filtered_time_series AS (
    SELECT DISTINCT
        JSONExtractString(labels, 'service_instance_id') as service_instance_id,
        JSONExtractString(labels, 'service_name') as service_name,
        fingerprint
    FROM signoz_metrics.time_series_v4_1day
    WHERE metric_name = 'kafka_consumer_fetch_latency_avg'
        AND temporality = 'Unspecified'
        AND unix_milli >= '%d'
        AND unix_milli < '%d'
        AND JSONExtractString(labels, 'service_name') = '%s'
        AND JSONExtractString(labels, 'client_id') = '%s'
),
aggregated_data AS (
    SELECT
        fingerprint,
        any(service_instance_id) as service_instance_id,
        any(service_name) as service_name,
        toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL '%d' SECOND) as ts,
        avg(value) as per_series_value
    FROM signoz_metrics.distributed_samples_v4
    INNER JOIN filtered_time_series USING fingerprint
    WHERE metric_name = 'kafka_consumer_fetch_latency_avg'
        AND unix_milli >= '%d'
        AND unix_milli < '%d'
    GROUP BY fingerprint, ts
    ORDER BY fingerprint, ts
)
SELECT
    service_name,
    service_instance_id,
    avg(per_series_value) as value
FROM aggregated_data
WHERE isNaN(per_series_value) = 0
GROUP BY service_name, service_instance_id
ORDER BY value DESC
`, start, end, serviceName, clientId, step, start, end)
	return query
}
