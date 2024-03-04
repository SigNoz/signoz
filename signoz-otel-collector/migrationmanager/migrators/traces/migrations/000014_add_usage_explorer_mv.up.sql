CREATE TABLE IF NOT EXISTS signoz_traces.usage_explorer ON CLUSTER {{.SIGNOZ_CLUSTER}} (
  timestamp DateTime64(9) CODEC(DoubleDelta, LZ4),
  service_name LowCardinality(String) CODEC(ZSTD(1)),
  count UInt64 CODEC(T64, ZSTD(1))
) ENGINE SummingMergeTree
PARTITION BY toDate(timestamp)
ORDER BY (timestamp, service_name)
TTL toDateTime(timestamp) + INTERVAL 1296000 SECOND DELETE;



CREATE MATERIALIZED VIEW IF NOT EXISTS signoz_traces.usage_explorer_mv ON CLUSTER {{.SIGNOZ_CLUSTER}}
TO signoz_traces.usage_explorer
AS SELECT
  toStartOfHour(timestamp) as timestamp,
  serviceName as service_name,
  count() as count
FROM signoz_traces.signoz_index_v2
GROUP BY timestamp, serviceName;