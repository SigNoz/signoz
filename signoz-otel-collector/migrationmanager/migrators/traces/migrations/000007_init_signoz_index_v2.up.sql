CREATE TABLE IF NOT EXISTS signoz_traces.signoz_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} (
  timestamp DateTime64(9) CODEC(DoubleDelta, LZ4),
  traceID FixedString(32) CODEC(ZSTD(1)),
  spanID String CODEC(ZSTD(1)),
  parentSpanID String CODEC(ZSTD(1)),
  serviceName LowCardinality(String) CODEC(ZSTD(1)),
  name LowCardinality(String) CODEC(ZSTD(1)),
  kind Int8 CODEC(T64, ZSTD(1)),
  durationNano UInt64 CODEC(T64, ZSTD(1)),
  statusCode Int16 CODEC(T64, ZSTD(1)),
  externalHttpMethod LowCardinality(String) CODEC(ZSTD(1)),
  externalHttpUrl LowCardinality(String) CODEC(ZSTD(1)),
  component LowCardinality(String) CODEC(ZSTD(1)),
  dbSystem LowCardinality(String) CODEC(ZSTD(1)),
  dbName LowCardinality(String) CODEC(ZSTD(1)),
  dbOperation LowCardinality(String) CODEC(ZSTD(1)),
  peerService LowCardinality(String) CODEC(ZSTD(1)),
  events Array(String) CODEC(ZSTD(2)),
  httpMethod LowCardinality(String) CODEC(ZSTD(1)),
  httpUrl LowCardinality(String) CODEC(ZSTD(1)), 
  httpCode LowCardinality(String) CODEC(ZSTD(1)), 
  httpRoute LowCardinality(String) CODEC(ZSTD(1)), 
  httpHost LowCardinality(String) CODEC(ZSTD(1)), 
  msgSystem LowCardinality(String) CODEC(ZSTD(1)), 
  msgOperation LowCardinality(String) CODEC(ZSTD(1)),
  hasError bool CODEC(T64, ZSTD(1)),
  tagMap Map(LowCardinality(String), String) CODEC(ZSTD(1)),
  PROJECTION timestampSort (SELECT * ORDER BY timestamp),
  INDEX idx_service serviceName TYPE bloom_filter GRANULARITY 4,
  INDEX idx_name name TYPE bloom_filter GRANULARITY 4,
  INDEX idx_kind kind TYPE minmax GRANULARITY 4,
  INDEX idx_duration durationNano TYPE minmax GRANULARITY 1,
  INDEX idx_httpCode httpCode TYPE set(0) GRANULARITY 1,
  INDEX idx_hasError hasError TYPE set(2) GRANULARITY 1,
  INDEX idx_tagMapKeys mapKeys(tagMap) TYPE bloom_filter(0.01) GRANULARITY 64,
  INDEX idx_tagMapValues mapValues(tagMap) TYPE bloom_filter(0.01) GRANULARITY 64,
  INDEX idx_httpRoute httpRoute TYPE bloom_filter GRANULARITY 4,
  INDEX idx_httpUrl httpUrl TYPE bloom_filter GRANULARITY 4,
  INDEX idx_httpHost httpHost TYPE bloom_filter GRANULARITY 4,
  INDEX idx_httpMethod httpMethod TYPE bloom_filter GRANULARITY 4,
  INDEX idx_timestamp timestamp TYPE minmax GRANULARITY 1
) ENGINE MergeTree
PARTITION BY toDate(timestamp)
PRIMARY KEY (serviceName, hasError, toStartOfHour(timestamp), name)
ORDER BY (serviceName, hasError, toStartOfHour(timestamp), name, timestamp)
TTL toDateTime(timestamp) + INTERVAL 1296000 SECOND DELETE
SETTINGS index_granularity = 8192;

SET allow_experimental_projection_optimization = 1;
