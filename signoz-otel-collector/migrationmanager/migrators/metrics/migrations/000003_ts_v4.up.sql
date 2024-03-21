CREATE TABLE IF NOT EXISTS signoz_metrics.time_series_v4 ON CLUSTER {{.SIGNOZ_CLUSTER}} (
    env LowCardinality(String) DEFAULT 'default',
    temporality LowCardinality(String) DEFAULT 'Unspecified',
    metric_name LowCardinality(String),
    description LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    unit LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    type LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    is_monotonic Bool DEFAULT false CODEC(ZSTD(1)),
    fingerprint UInt64 CODEC(Delta, ZSTD),
    unix_milli Int64 CODEC(Delta, ZSTD),
    labels String CODEC(ZSTD(5)),
    INDEX idx_labels labels TYPE ngrambf_v1(4, 1024, 3, 0) GRANULARITY 1
)
ENGINE = ReplacingMergeTree
        PARTITION BY toDate(unix_milli / 1000)
        ORDER BY (env, temporality, metric_name, fingerprint, unix_milli)
        TTL toDateTime(unix_milli/1000) + INTERVAL 2592000 SECOND DELETE
        SETTINGS ttl_only_drop_parts = 1;

CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_time_series_v4 ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_metrics.time_series_v4 ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", signoz_metrics, time_series_v4, cityHash64(env, temporality, metric_name, fingerprint));