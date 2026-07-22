-- Epoch harness schema: the real signoz_metrics tables after collector
-- migration 1012, with distributed_* as plain views (single-node harness).
-- MV queries are verbatim copies of migration 1012.

CREATE DATABASE IF NOT EXISTS signoz_metrics;

CREATE TABLE signoz_metrics.samples_v4
(
    env LowCardinality(String) DEFAULT 'default',
    temporality LowCardinality(String) DEFAULT 'Unspecified',
    metric_name LowCardinality(String),
    fingerprint UInt64 CODEC(Delta(8), ZSTD(1)),
    unix_milli Int64 CODEC(DoubleDelta, ZSTD(1)),
    value Float64 CODEC(Gorilla, ZSTD(1)),
    flags UInt32 DEFAULT 0 CODEC(ZSTD(1)),
    inserted_at_unix_milli Int64 CODEC(ZSTD(1)),
    start_ts Int64 DEFAULT 0 CODEC(DoubleDelta, ZSTD(1))
)
ENGINE = MergeTree
PARTITION BY toDate(unix_milli / 1000)
ORDER BY (env, temporality, metric_name, fingerprint, unix_milli)
TTL toDateTime(unix_milli / 1000) + toIntervalSecond(2592000)
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

CREATE TABLE signoz_metrics.samples_v4_agg_5m
(
    env LowCardinality(String) DEFAULT 'default',
    temporality LowCardinality(String) DEFAULT 'Unspecified',
    metric_name LowCardinality(String),
    fingerprint UInt64 CODEC(ZSTD(1)),
    unix_milli Int64 CODEC(Delta(8), ZSTD(1)),
    last SimpleAggregateFunction(anyLast, Float64) CODEC(ZSTD(1)),
    min SimpleAggregateFunction(min, Float64) CODEC(ZSTD(1)),
    max SimpleAggregateFunction(max, Float64) CODEC(ZSTD(1)),
    sum SimpleAggregateFunction(sum, Float64) CODEC(ZSTD(1)),
    count SimpleAggregateFunction(sum, UInt64) CODEC(ZSTD(1)),
)
ENGINE = AggregatingMergeTree
PARTITION BY toDate(unix_milli / 1000)
ORDER BY (env, temporality, metric_name, fingerprint, unix_milli)
TTL toDateTime(unix_milli / 1000) + toIntervalSecond(2592000)
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

CREATE TABLE signoz_metrics.samples_v4_agg_30m
(
    env LowCardinality(String) DEFAULT 'default',
    temporality LowCardinality(String) DEFAULT 'Unspecified',
    metric_name LowCardinality(String),
    fingerprint UInt64 CODEC(ZSTD(1)),
    unix_milli Int64 CODEC(Delta(8), ZSTD(1)),
    last SimpleAggregateFunction(anyLast, Float64) CODEC(ZSTD(1)),
    min SimpleAggregateFunction(min, Float64) CODEC(ZSTD(1)),
    max SimpleAggregateFunction(max, Float64) CODEC(ZSTD(1)),
    sum SimpleAggregateFunction(sum, Float64) CODEC(ZSTD(1)),
    count SimpleAggregateFunction(sum, UInt64) CODEC(ZSTD(1)),
)
ENGINE = AggregatingMergeTree
PARTITION BY toDate(unix_milli / 1000)
ORDER BY (env, temporality, metric_name, fingerprint, unix_milli)
TTL toDateTime(unix_milli / 1000) + toIntervalSecond(2592000)
SETTINGS index_granularity = 8192, ttl_only_drop_parts = 1;

CREATE MATERIALIZED VIEW signoz_metrics.samples_v4_agg_5m_mv
TO signoz_metrics.samples_v4_agg_5m
AS SELECT
    env, temporality, metric_name, fingerprint,
    intDiv(unix_milli, 300000) * 300000 as unix_milli,
    anyLast(value) as last, min(value) as min, max(value) as max,
    sum(value) as sum, count(*) as count
FROM signoz_metrics.samples_v4
WHERE bitAnd(flags, 1) = 0
GROUP BY env, temporality, metric_name, fingerprint, unix_milli;

CREATE MATERIALIZED VIEW signoz_metrics.samples_v4_agg_30m_mv
TO signoz_metrics.samples_v4_agg_30m
AS SELECT
    env, temporality, metric_name, fingerprint,
    intDiv(unix_milli, 1800000) * 1800000 AS unix_milli,
    anyLast(last) AS last, min(min) AS min, max(max) AS max,
    sum(sum) AS sum, sum(count) AS count
FROM signoz_metrics.samples_v4_agg_5m
GROUP BY env, temporality, metric_name, fingerprint, unix_milli;

-- the time series catalog table the 1-day queries join against
CREATE TABLE signoz_metrics.time_series_v4_1day
(
    env LowCardinality(String) DEFAULT 'default',
    temporality LowCardinality(String) DEFAULT 'Unspecified',
    metric_name LowCardinality(String),
    fingerprint UInt64 CODEC(Delta(8), ZSTD(1)),
    unix_milli Int64 CODEC(Delta(8), ZSTD(1)),
    labels String CODEC(ZSTD(5))
)
ENGINE = ReplacingMergeTree
ORDER BY (env, temporality, metric_name, fingerprint, unix_milli);

-- single-node stand-ins for the distributed tables the querier reads
CREATE VIEW signoz_metrics.distributed_samples_v4 AS SELECT * FROM signoz_metrics.samples_v4;
CREATE VIEW signoz_metrics.distributed_samples_v4_agg_5m AS SELECT * FROM signoz_metrics.samples_v4_agg_5m;
CREATE VIEW signoz_metrics.distributed_samples_v4_agg_30m AS SELECT * FROM signoz_metrics.samples_v4_agg_30m;
