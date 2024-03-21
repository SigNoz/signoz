ALTER TABLE signoz_metrics.time_series_v3 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    ADD COLUMN IF NOT EXISTS description LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS unit LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS type LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS is_monotonic Bool DEFAULT false CODEC(ZSTD(1));

ALTER TABLE signoz_metrics.distributed_time_series_v3 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    ADD COLUMN IF NOT EXISTS description LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS unit LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS type LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS is_monotonic Bool DEFAULT false CODEC(ZSTD(1));

ALTER TABLE signoz_metrics.time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    ADD COLUMN IF NOT EXISTS description LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS unit LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS type LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS is_monotonic Bool DEFAULT false CODEC(ZSTD(1));

ALTER TABLE signoz_metrics.distributed_time_series_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    ADD COLUMN IF NOT EXISTS description LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS unit LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS type LowCardinality(String) DEFAULT '' CODEC(ZSTD(1)),
    ADD COLUMN IF NOT EXISTS is_monotonic Bool DEFAULT false CODEC(ZSTD(1));
