CREATE TABLE IF NOT EXISTS signoz_metrics.samples_v4 ON CLUSTER {{.SIGNOZ_CLUSTER}} (
    env LowCardinality(String) DEFAULT 'default',
    temporality LowCardinality(String) DEFAULT 'Unspecified',
    metric_name LowCardinality(String),
    fingerprint UInt64 CODEC(Delta, ZSTD),
    unix_milli Int64 CODEC(DoubleDelta, ZSTD),
    value Float64 Codec(Gorilla, ZSTD)
)
ENGINE = MergeTree
        PARTITION BY toDate(unix_milli / 1000)
        ORDER BY (env, temporality, metric_name, fingerprint, unix_milli)
        TTL toDateTime(unix_milli/1000) + INTERVAL 2592000 SECOND DELETE
        SETTINGS ttl_only_drop_parts = 1;

CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_samples_v4 ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_metrics.samples_v4 ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_metrics", samples_v4, cityHash64(env, temporality, metric_name, fingerprint));