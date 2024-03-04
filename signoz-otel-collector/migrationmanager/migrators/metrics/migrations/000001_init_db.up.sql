CREATE TABLE IF NOT EXISTS signoz_metrics.samples_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} (
                        metric_name LowCardinality(String),
                        fingerprint UInt64 Codec(DoubleDelta, LZ4),
                        timestamp_ms Int64 Codec(DoubleDelta, LZ4),
                        value Float64 Codec(Gorilla, LZ4)
                )
                ENGINE = MergeTree
                        PARTITION BY toDate(timestamp_ms / 1000)
                        ORDER BY (metric_name, fingerprint, timestamp_ms)
                         TTL toDateTime(timestamp_ms/1000) + INTERVAL 2592000 SECOND DELETE;

CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_samples_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_metrics.samples_v2 ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_metrics", samples_v2, cityHash64(metric_name, fingerprint));

ALTER TABLE signoz_metrics.samples_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 1;

SET allow_experimental_object_type = 1;

CREATE TABLE IF NOT EXISTS signoz_metrics.time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}}(
                        metric_name LowCardinality(String),
                        fingerprint UInt64 Codec(DoubleDelta, LZ4),
                        timestamp_ms Int64 Codec(DoubleDelta, LZ4),
                        labels String Codec(ZSTD(5))
                )
                ENGINE = ReplacingMergeTree
                        PARTITION BY toDate(timestamp_ms / 1000)
                        ORDER BY (metric_name, fingerprint)
                        TTL toDateTime(timestamp_ms/1000) + INTERVAL 2592000 SECOND DELETE;

CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_metrics.time_series_v2 ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", signoz_metrics, time_series_v2, cityHash64(metric_name, fingerprint));

ALTER TABLE signoz_metrics.time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} DROP COLUMN IF EXISTS labels_object;

ALTER TABLE signoz_metrics.distributed_time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} DROP COLUMN IF EXISTS labels_object;

ALTER TABLE signoz_metrics.time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} MODIFY SETTING ttl_only_drop_parts = 1;

ALTER TABLE signoz_metrics.time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} ADD COLUMN IF NOT EXISTS temporality LowCardinality(String) DEFAULT 'Unspecified' CODEC(ZSTD(5));

ALTER TABLE signoz_metrics.distributed_time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} ADD COLUMN IF NOT EXISTS temporality LowCardinality(String) DEFAULT 'Unspecified' CODEC(ZSTD(5));

ALTER TABLE signoz_metrics.time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}} ADD INDEX IF NOT EXISTS temporality_index temporality TYPE SET(3) GRANULARITY 1;

CREATE TABLE IF NOT EXISTS signoz_metrics.time_series_v3 ON CLUSTER {{.SIGNOZ_CLUSTER}} (
                        env LowCardinality(String) DEFAULT 'default',
                        temporality LowCardinality(String) DEFAULT 'Unspecified',
                        metric_name LowCardinality(String),
                        fingerprint UInt64 CODEC(Delta, ZSTD),
                        timestamp_ms Int64 CODEC(Delta, ZSTD),
                        labels String CODEC(ZSTD(5))
                )
                ENGINE = ReplacingMergeTree
                        PARTITION BY toDate(timestamp_ms / 1000)
                        ORDER BY (env, temporality, metric_name, fingerprint);

CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_time_series_v3 ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_metrics.time_series_v3 ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", signoz_metrics, time_series_v3, cityHash64(env, temporality, metric_name, fingerprint));