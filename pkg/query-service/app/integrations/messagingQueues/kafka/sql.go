package kafka

import (
	"fmt"
)

func generateConsumerSQL(start, end int64, topic, partition string) string {
	query := fmt.Sprintf(`
WITH 
-- Sub query for p99 calculation
p99_query AS (
    SELECT
        stringTagMap['messaging.kafka.consumer.group'] as consumer_group,
        serviceName,
        quantile(0.99)(durationNano) / 1000000 as p99
    FROM signoz_traces.signoz_index_v2
    WHERE
        timestamp >= '%d'
      AND timestamp <= '%d'
      AND kind = 5
      AND stringTagMap['messaging.destination.name'] = '%s'
      AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY consumer_group, serviceName
),

-- Sub query for RPS calculation
rps_query AS (
    SELECT
        stringTagMap['messaging.kafka.consumer.group'] AS consumer_group,
        serviceName,
        count(*) / ((%d - %d) / 1000000000) AS rps  -- Convert nanoseconds to seconds
    FROM signoz_traces.signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 5
        AND stringTagMap['messaging.destination.name'] = '%s'
        AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY consumer_group, serviceName
),

-- Sub query for error rate calculation
error_rate_query AS (
    SELECT
        stringTagMap['messaging.kafka.consumer.group'] AS consumer_group,
        serviceName,
        count(*) / ((%d - %d) / 1000000000) AS error_rate  -- Convert nanoseconds to seconds
    FROM signoz_traces.signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND statusCode = 2
        AND kind = 5
        AND stringTagMap['messaging.destination.name'] = '%s'
        AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY consumer_group, serviceName
),

-- Sub query for average message size calculation
avg_msg_size_query AS (
    SELECT
        stringTagMap['messaging.kafka.consumer.group'] AS consumer_group,
        serviceName,
        avg(numberTagMap['messaging.message.body.size']) AS avg_msg_size
    FROM signoz_traces.signoz_index_v2
    WHERE
        timestamp >= '%d'
        AND timestamp <= '%d'
        AND kind = 5
        AND stringTagMap['messaging.destination.name'] = '%s'
        AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY consumer_group, serviceName
)

-- Main query to combine all metrics
SELECT
    p99_query.consumer_group AS consumer_group,
    p99_query.serviceName AS service_name,
    p99_query.p99 AS p99,
    COALESCE(error_rate_query.error_rate, 0) AS error_rate,
    COALESCE(rps_query.rps, 0) AS throughput,
    COALESCE(avg_msg_size_query.avg_msg_size, 0) AS avg_msg_size
FROM
    p99_query
    LEFT JOIN rps_query ON p99_query.consumer_group = rps_query.consumer_group
        AND p99_query.serviceName = rps_query.serviceName
    LEFT JOIN error_rate_query ON p99_query.consumer_group = error_rate_query.consumer_group
        AND p99_query.serviceName = error_rate_query.serviceName
    LEFT JOIN avg_msg_size_query ON p99_query.consumer_group = avg_msg_size_query.consumer_group
        AND p99_query.serviceName = avg_msg_size_query.serviceName
ORDER BY
    p99_query.consumer_group;
`, start, end, topic, partition, end, start, start, end, topic, partition, end, start, start, end, topic, partition, end, start, topic, partition)
	return query
}

func generateProducerSQL(start, end int64, topic, partition string) string {
	query := fmt.Sprintf(`

-- producer
WITH
-- Subquery for p99 calculation
p99_query AS (
    SELECT
        serviceName,
        quantile(0.99)(durationNano) / 1000000 as p99
    FROM signoz_traces.signoz_index_v2
    WHERE
        timestamp >= '%d'
      AND timestamp <= '%d'
      AND kind = 4
      AND stringTagMap['messaging.destination.name'] = '%s'
      AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY serviceName
),

-- Subquery for RPS calculation
rps_query AS (
    SELECT
        serviceName,
        count(*) / ((%d - %d) / 1000000000) as rps  -- Convert nanoseconds to seconds
    FROM signoz_traces.signoz_index_v2
    WHERE
        timestamp >= '%d'
      AND timestamp <= '%d'
      AND kind = 4
      AND stringTagMap['messaging.destination.name'] = '%s'
      AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY serviceName
),

-- Subquery for error rate calculation
error_rate_query AS (
    SELECT
        serviceName,
        count(*) / ((%d - %d) / 1000000000) as error_rate  -- Convert nanoseconds to seconds
    FROM signoz_traces.signoz_index_v2
    WHERE
      timestamp >= '%d'
      AND timestamp <= '%d'
      AND statusCode = 2
      AND kind = 4
      AND stringTagMap['messaging.destination.name'] = '%s'
      AND stringTagMap['messaging.destination.partition.id'] = '%s'
    GROUP BY serviceName
)

-- Main query to combine all metrics
SELECT
    p99_query.serviceName AS service_name,
    p99_query.p99,
    COALESCE(error_rate_query.error_rate, 0) AS error_rate,
    COALESCE(rps_query.rps, 0) AS rps
FROM
    p99_query
        LEFT JOIN
    rps_query ON p99_query.serviceName = rps_query.serviceName
        LEFT JOIN
    error_rate_query ON p99_query.serviceName = error_rate_query.serviceName
ORDER BY
    p99_query.serviceName;

`, start, end, topic, partition, end, start, start, end, topic, partition, end, start, start, end, topic, partition)
	return query
}
