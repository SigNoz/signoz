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
    COALESCE(total_count / %d, 0) AS throughput  -- Convert nanoseconds to seconds
FROM
    producer_query
ORDER BY
    serviceName;

`, start, end, queueType, topic, partition, timeRange)
	return query
}

func generateNetworkLatencyThroughputSQL(start, end int64, consumerGroup, partitionID, queueType string) string {
	timeRange := (end - start) / 1000000000
	query := fmt.Sprintf(`
SELECT
    stringTagMap['messaging.client_id'] AS client_id,
	stringTagMap['service.instance.id'] AS service_instance_id,
    serviceName AS service_name,
    count(*) / %d AS throughput
FROM signoz_traces.distributed_signoz_index_v2
WHERE
    timestamp >= '%d'
    AND timestamp <= '%d'
    AND kind = 5
    AND msgSystem = '%s' 
    AND stringTagMap['messaging.kafka.consumer.group'] = '%s'
    AND stringTagMap['messaging.destination.partition.id'] = '%s'
GROUP BY service_name, client_id, service_instance_id
ORDER BY throughput DESC
`, timeRange, start, end, queueType, consumerGroup, partitionID)
	return query
}

func onboardProducersSQL(start, end int64, queueType string) string {
	query := fmt.Sprintf(`
SELECT 
	CASE 
		WHEN COUNT(*) = 0 THEN 1
		WHEN SUM(msgSystem = '%s') = 0 THEN 2
		WHEN SUM(kind = 4) = 0 THEN 3
		WHEN SUM(has(stringTagMap, 'messaging.destination.name')) = 0 THEN 4
		WHEN SUM(has(stringTagMap, 'messaging.destination.partition.id')) = 0 THEN 5
		ELSE 0
	END AS result_code
FROM signoz_traces.distributed_signoz_index_v2
WHERE 
	timestamp >= '%d'
	AND timestamp <= '%d';`, queueType, start, end)
	return query
}

func onboardConsumerSQL(start, end int64, queueType string) string {
	query := fmt.Sprintf(`
SELECT 
	CASE 
		WHEN COUNT(*) = 0 THEN 1
		WHEN SUM(msgSystem = '%s') = 0 THEN 2
		WHEN SUM(kind = 5) = 0 THEN 3
		WHEN SUM(serviceName IS NOT NULL) = 0 THEN 4
		WHEN SUM(has(stringTagMap, 'messaging.destination.name')) = 0 THEN 5
		WHEN SUM(has(stringTagMap, 'messaging.destination.partition.id')) = 0 THEN 6
		WHEN SUM(has(stringTagMap, 'messaging.kafka.consumer.group')) = 0 THEN 7
		WHEN SUM(has(numberTagMap, 'messaging.message.body.size')) = 0 THEN 8
		WHEN SUM(has(stringTagMap, 'messaging.client_id')) = 0 THEN 9
		WHEN SUM(has(stringTagMap, 'service.instance.id')) = 0 THEN 10
		ELSE 0
	END AS result_code
FROM signoz_traces.distributed_signoz_index_v2
WHERE 
	timestamp >= '%d'
	AND timestamp <= '%d';`, queueType, start, end)
	return query
}

func onboardKafkaSQL(start, end int64) string {
	query := fmt.Sprintf(`
SELECT
	CASE
		WHEN COUNT(CASE WHEN metric_name = 'kafka_consumer_fetch_latency_avg' THEN 1 END) = 0
            AND COUNT(CASE WHEN metric_name = 'kafka_consumer_group_lag' THEN 1 END) = 0 THEN 1
		WHEN COUNT(CASE WHEN metric_name = 'kafka_consumer_fetch_latency_avg' THEN 1 END) = 0 THEN 2
		WHEN COUNT(CASE WHEN metric_name = 'kafka_consumer_group_lag' THEN 1 END) = 0 THEN 3
		ELSE 0
	END AS result_code
FROM signoz_metrics.time_series_v4_1day
WHERE
	metric_name IN ('kafka_consumer_fetch_latency_avg', 'kafka_consumer_group_lag')
	AND unix_milli >= '%d'
	AND unix_milli < '%d';`, start, end)
	return query
}
