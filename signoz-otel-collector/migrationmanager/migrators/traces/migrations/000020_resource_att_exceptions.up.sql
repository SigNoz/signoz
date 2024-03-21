ALTER TABLE signoz_traces.signoz_error_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    ADD COLUMN IF NOT EXISTS resourceTagsMap Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ADD INDEX IF NOT EXISTS idx_resourceTagsMapKeys mapKeys(resourceTagsMap) TYPE bloom_filter(0.01) GRANULARITY 64,
    ADD INDEX IF NOT EXISTS idx_resourceTagsMapValues mapValues(resourceTagsMap) TYPE bloom_filter(0.01) GRANULARITY 64,
    ADD COLUMN demo Int8 DEFAULT 0;


ALTER TABLE signoz_traces.distributed_signoz_error_index_v2 ON CLUSTER {{.SIGNOZ_CLUSTER}}
    ADD COLUMN IF NOT EXISTS resourceTagsMap Map(LowCardinality(String), String) CODEC(ZSTD(1)),
    ADD COLUMN demo Int8 DEFAULT 0;

