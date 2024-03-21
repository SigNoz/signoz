CREATE TABLE IF NOT EXISTS signoz_logs.tag_attributes ON CLUSTER {{.SIGNOZ_CLUSTER}} (
    timestamp DateTime CODEC(ZSTD(1)), 
    tagKey LowCardinality(String) CODEC(ZSTD(1)),
    tagType Enum('tag', 'resource') CODEC(ZSTD(1)),
    tagDataType Enum('string', 'bool', 'int64', 'float64') CODEC(ZSTD(1)),
    stringTagValue String CODEC(ZSTD(1)),
    int64TagValue Nullable(Int64) CODEC(ZSTD(1)),
    float64TagValue Nullable(Float64) CODEC(ZSTD(1))
) ENGINE ReplacingMergeTree
ORDER BY (tagKey, tagType, tagDataType, stringTagValue, int64TagValue, float64TagValue)
TTL toDateTime(timestamp) + INTERVAL 172800 SECOND DELETE
SETTINGS ttl_only_drop_parts = 1, allow_nullable_key = 1;

CREATE TABLE IF NOT EXISTS signoz_logs.distributed_tag_attributes ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_logs.tag_attributes
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_logs", tag_attributes, rand());
