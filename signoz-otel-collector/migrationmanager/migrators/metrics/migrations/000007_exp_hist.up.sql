CREATE TABLE IF NOT EXISTS signoz_metrics.exp_hist ON CLUSTER {{.SIGNOZ_CLUSTER}} (
    env LowCardinality(String) DEFAULT 'default',
    temporality LowCardinality(String) DEFAULT 'Unspecified',
    metric_name LowCardinality(String),
    fingerprint UInt64 CODEC(Delta, ZSTD),
    unix_milli Int64 CODEC(DoubleDelta, ZSTD),
    count UInt64 CODEC(ZSTD(1)),
    sum Float64 Codec(Gorilla, ZSTD),
    min Float64 Codec(Gorilla, ZSTD),
    max Float64 Codec(Gorilla, ZSTD),
    sketch AggregateFunction(quantilesDD(0.01, 0.5, 0.75, 0.9, 0.95, 0.99), UInt64) CODEC(ZSTD(1))
)
ENGINE = MergeTree
        PARTITION BY toDate(unix_milli / 1000)
        ORDER BY (env, temporality, metric_name, fingerprint, unix_milli)
        TTL toDateTime(unix_milli/1000) + INTERVAL 2592000 SECOND DELETE
        SETTINGS ttl_only_drop_parts = 1;

CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_exp_hist ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_metrics.exp_hist ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_metrics", exp_hist, cityHash64(env, temporality, metric_name, fingerprint));