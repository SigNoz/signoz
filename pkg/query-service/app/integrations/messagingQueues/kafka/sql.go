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
