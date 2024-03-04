CREATE TABLE IF NOT EXISTS signoz_traces.signoz_spans ON CLUSTER {{.SIGNOZ_CLUSTER}} (
    timestamp DateTime64(9) CODEC(DoubleDelta, LZ4),
    traceID FixedString(32) CODEC(ZSTD(1)),
    model String CODEC(ZSTD(9))
) ENGINE MergeTree
PARTITION BY toDate(timestamp)
ORDER BY traceID
TTL toDateTime(timestamp) + INTERVAL 1296000 SECOND DELETE
SETTINGS index_granularity=1024;