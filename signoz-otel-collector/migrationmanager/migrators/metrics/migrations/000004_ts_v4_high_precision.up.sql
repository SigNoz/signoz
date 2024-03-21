CREATE TABLE IF NOT EXISTS signoz_metrics.time_series_v4_6hrs ON CLUSTER {{.SIGNOZ_CLUSTER}} (
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

CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_time_series_v4_6hrs ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_metrics.time_series_v4_6hrs ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", signoz_metrics, time_series_v4_6hrs, cityHash64(env, temporality, metric_name, fingerprint));

CREATE TABLE IF NOT EXISTS signoz_metrics.time_series_v4_1day ON CLUSTER {{.SIGNOZ_CLUSTER}} (
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

CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_time_series_v4_1day ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_metrics.time_series_v4_1day ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", signoz_metrics, time_series_v4_1day, cityHash64(env, temporality, metric_name, fingerprint));

-- mat views

-- unix_milli rounded nearest 6 hours

CREATE MATERIALIZED VIEW IF NOT EXISTS signoz_metrics.time_series_v4_6hrs_mv ON CLUSTER {{.SIGNOZ_CLUSTER}}
TO signoz_metrics.time_series_v4_6hrs
AS SELECT
    env,
    temporality,
    metric_name,
    description,
    unit,
    type,
    is_monotonic,
    fingerprint,
    floor(unix_milli/21600000)*21600000 AS unix_milli,
    labels
FROM signoz_metrics.time_series_v4;

-- unix_milli rounded nearest 1 day

CREATE MATERIALIZED VIEW IF NOT EXISTS signoz_metrics.time_series_v4_1day_mv ON CLUSTER {{.SIGNOZ_CLUSTER}}
TO signoz_metrics.time_series_v4_1day
AS SELECT
    env,
    temporality,
    metric_name,
    description,
    unit,
    type,
    is_monotonic,
    fingerprint,
    floor(unix_milli/86400000)*86400000 AS unix_milli,
    labels
FROM signoz_metrics.time_series_v4;