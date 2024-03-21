CREATE TABLE IF NOT EXISTS signoz_traces.signoz_error_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} (
  timestamp DateTime64(9) CODEC(DoubleDelta, LZ4),
  errorID FixedString(32) CODEC(ZSTD(1)),
  groupID FixedString(32) CODEC(ZSTD(1)),
  traceID FixedString(32) CODEC(ZSTD(1)),
  spanID String CODEC(ZSTD(1)),
  serviceName LowCardinality(String) CODEC(ZSTD(1)),
  exceptionType LowCardinality(String) CODEC(ZSTD(1)),
  exceptionMessage String CODEC(ZSTD(1)),
  exceptionStacktrace String CODEC(ZSTD(1)),
  exceptionEscaped bool CODEC(T64, ZSTD(1)),
  INDEX idx_error_id errorID TYPE bloom_filter GRANULARITY 4
) ENGINE MergeTree
PARTITION BY toDate(timestamp)
ORDER BY (timestamp, groupID)
TTL toDateTime(timestamp) + INTERVAL 1296000 SECOND DELETE;
