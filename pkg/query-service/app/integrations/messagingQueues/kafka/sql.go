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
        sumIf(1, statusCode = 2) AS error_count,
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
    COALESCE(total_requests / %d, 0) AS throughput,
    COALESCE(avg_msg_size, 0) AS avg_msg_size
FROM
    consumer_query
ORDER BY
    serviceName;
`, start, end, queueType, topic, partition, consumerGroup, timeRange)
	return query
}

// S1 landing
func generatePartitionLatencySQL(start, end int64, queueType string) string {
	timeRange := (end - start) / 1000000000
	query := fmt.Sprintf(`
WITH partition_query AS (
    SELECT
        quantile(0.99)(durationNano) / 1000000 AS p99,
        count(*) AS total_requests,
        stringTagMap['messaging.destination.name'] AS topic,
		stringTagMap['messaging.destination.partition.id'] AS partition
    FROM signoz_traces.distributed_signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 4
        AND msgSystem = '%s'
    GROUP BY topic, partition
)

SELECT
    topic,
    partition,
    p99,
	COALESCE(total_requests / %d, 0) AS throughput
FROM
    partition_query
ORDER BY
    topic;
`, start, end, queueType, timeRange)
	return query
}

// S1 consumer
func generateConsumerPartitionLatencySQL(start, end int64, topic, partition, queueType string) string {
	timeRange := (end - start) / 1000000000
	query := fmt.Sprintf(`
WITH consumer_pl AS (
    SELECT
        stringTagMap['messaging.kafka.consumer.group'] AS consumer_group,
        serviceName,
        quantile(0.99)(durationNano) / 1000000 AS p99,
        COUNT(*) AS total_requests,
        sumIf(1, statusCode = 2) AS error_count
    FROM signoz_traces.distributed_signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 5
        AND msgSystem = '%s'
        AND stringTagMap['messaging.destination.name'] = '%s'
        AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY consumer_group, serviceName
)

SELECT
    consumer_group,
    serviceName AS service_name,
    p99,
    COALESCE((error_count * 100.0) / total_requests, 0) AS error_rate,
    COALESCE(total_requests / %d, 0) AS throughput
FROM
    consumer_pl
ORDER BY
    consumer_group;
`, start, end, queueType, topic, partition, timeRange)
	return query
}

// S3, producer overview
func generateProducerPartitionThroughputSQL(start, end int64, queueType string) string {
	timeRange := (end - start) / 1000000000
	// t, svc, rps, byte*, p99, err
	query := fmt.Sprintf(`
WITH producer_latency AS (
    SELECT
		serviceName,
        quantile(0.99)(durationNano) / 1000000 AS p99,
		stringTagMap['messaging.destination.name'] AS topic,
        COUNT(*) AS total_requests,
        sumIf(1, statusCode = 2) AS error_count
    FROM signoz_traces.distributed_signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 4
        AND msgSystem = '%s'
    GROUP BY topic, serviceName
)

SELECT
	topic,
	serviceName AS service_name,
    p99,
    COALESCE((error_count * 100.0) / total_requests, 0) AS error_rate,
    COALESCE(total_requests / %d, 0) AS throughput
FROM
    producer_latency
`, start, end, queueType, timeRange)
	return query
}

// S3, producer topic/service overview
func generateProducerTopicLatencySQL(start, end int64, topic, service, queueType string) string {
	timeRange := (end - start) / 1000000000
	query := fmt.Sprintf(`
WITH consumer_latency AS (
    SELECT
        quantile(0.99)(durationNano) / 1000000 AS p99,
		stringTagMap['messaging.destination.partition.id'] AS partition,
        COUNT(*) AS total_requests,
        sumIf(1, statusCode = 2) AS error_count
    FROM signoz_traces.distributed_signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 4
		AND serviceName = '%s'
        AND msgSystem = '%s'
		AND stringTagMap['messaging.destination.name'] = '%s'
    GROUP BY partition
)

SELECT
	partition,
    p99,
    COALESCE((error_count * 100.0) / total_requests, 0) AS error_rate,
    COALESCE(total_requests / %d, 0) AS throughput
FROM
    consumer_latency
`, start, end, service, queueType, topic, timeRange)
	return query
}

// S3 consumer overview
func generateConsumerLatencySQL(start, end int64, queueType string) string {
	timeRange := (end - start) / 1000000000
	query := fmt.Sprintf(`
WITH consumer_latency AS (
    SELECT
        serviceName,
        stringTagMap['messaging.destination.name'] AS topic,
        quantile(0.99)(durationNano) / 1000000 AS p99,
        COUNT(*) AS total_requests,
        sumIf(1, statusCode = 2) AS error_count,
        SUM(numberTagMap['messaging.message.body.size']) AS total_bytes
    FROM signoz_traces.distributed_signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 5
        AND msgSystem = '%s'
    GROUP BY topic, serviceName
)

SELECT
    topic,
    serviceName AS service_name,
    p99,
    COALESCE((error_count * 100.0) / total_requests, 0) AS error_rate,
    COALESCE(total_requests / %d, 0) AS ingestion_rate,
    COALESCE(total_bytes / %d, 0) AS byte_rate
FROM
    consumer_latency
ORDER BY
    topic;
`, start, end, queueType, timeRange, timeRange)
	return query
}

// S3 consumer topic/service
func generateConsumerServiceLatencySQL(start, end int64, topic, service, queueType string) string {
	timeRange := (end - start) / 1000000000
	query := fmt.Sprintf(`
WITH consumer_latency AS (
    SELECT
        quantile(0.99)(durationNano) / 1000000 AS p99,
		stringTagMap['messaging.destination.partition.id'] AS partition,
        COUNT(*) AS total_requests,
        sumIf(1, statusCode = 2) AS error_count
    FROM signoz_traces.distributed_signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 5
		AND serviceName = '%s'
        AND msgSystem = '%s'
		AND stringTagMap['messaging.destination.name'] = '%s'
    GROUP BY partition
)

SELECT
	partition,
    p99,
    COALESCE((error_count * 100.0) / total_requests, 0) AS error_rate,
    COALESCE(total_requests / %d, 0) AS throughput
FROM
    consumer_latency
`, start, end, service, queueType, topic, timeRange)
	return query
}

// s4
func generateProducerConsumerEvalSQL(start, end int64, queueType string, evalTime int64) string {
	query := fmt.Sprintf(`
WITH trace_data AS (
    SELECT
        p.serviceName AS producer_service,
        c.serviceName AS consumer_service,
        p.traceID,
        p.timestamp AS producer_timestamp,
        c.timestamp AS consumer_timestamp,
        p.durationNano AS durationNano,
        (toUnixTimestamp64Nano(c.timestamp) - toUnixTimestamp64Nano(p.timestamp)) + p.durationNano AS time_difference
    FROM
        signoz_traces.distributed_signoz_index_v2 p
    INNER JOIN
        signoz_traces.distributed_signoz_index_v2 c
            ON p.traceID = c.traceID
            AND c.parentSpanID = p.spanID
    WHERE
        p.kind = 4
        AND c.kind = 5
        AND toUnixTimestamp64Nano(p.timestamp) BETWEEN '%d' AND '%d'
        AND toUnixTimestamp64Nano(c.timestamp) BETWEEN '%d' AND '%d'
        AND c.msgSystem = '%s'
        AND p.msgSystem = '%s'
)

SELECT
    producer_service,
    consumer_service,
    COUNT(*) AS total_spans,
    SUM(time_difference > '%d') AS breached_spans,
    ((breached_spans) * 100.0) / total_spans AS breach_percentage,
    arraySlice(
        arrayMap(x -> x.1,
            arraySort(
                x -> -x.2,
                groupArrayIf((traceID, time_difference), time_difference > '%d')
            )
        ),
        1, 10
    ) AS top_traceIDs
FROM trace_data
GROUP BY
    producer_service,
    consumer_service
`, start, end, start, end, queueType, queueType, evalTime, evalTime)
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
        sumIf(1, statusCode = 2) AS error_count
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
    COALESCE(total_count / %d, 0) AS throughput
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
    COUNT(*) = 0 AS entries,
    COUNT(IF(msgSystem = '%s', 1, NULL)) = 0 AS queue,
    COUNT(IF(kind = 4, 1, NULL)) = 0 AS kind,
    COUNT(IF(has(stringTagMap, 'messaging.destination.name'), 1, NULL)) = 0 AS destination,
    COUNT(IF(has(stringTagMap, 'messaging.destination.partition.id'), 1, NULL)) = 0 AS partition
FROM 
    signoz_traces.distributed_signoz_index_v2
WHERE 
    timestamp >= '%d'
    AND timestamp <= '%d';`, queueType, start, end)
	return query
}

func onboardConsumerSQL(start, end int64, queueType string) string {
	query := fmt.Sprintf(`
SELECT  
    COUNT(*) = 0 AS entries,
    COUNT(IF(msgSystem = '%s', 1, NULL)) = 0 AS queue,
    COUNT(IF(kind = 5, 1, NULL)) = 0 AS kind,
    COUNT(serviceName) = 0 AS svc,
    COUNT(IF(has(stringTagMap, 'messaging.destination.name'), 1, NULL)) = 0 AS destination,
    COUNT(IF(has(stringTagMap, 'messaging.destination.partition.id'), 1, NULL)) = 0 AS partition,
    COUNT(IF(has(stringTagMap, 'messaging.kafka.consumer.group'), 1, NULL)) = 0 AS cgroup,
    COUNT(IF(has(numberTagMap, 'messaging.message.body.size'), 1, NULL)) = 0 AS bodysize,
    COUNT(IF(has(stringTagMap, 'messaging.client_id'), 1, NULL)) = 0 AS clientid,
    COUNT(IF(has(stringTagMap, 'service.instance.id'), 1, NULL)) = 0 AS instanceid
FROM signoz_traces.distributed_signoz_index_v2
WHERE 
    timestamp >= '%d'
    AND timestamp <= '%d';`, queueType, start, end)
	return query
}
