CREATE TABLE IF NOT EXISTS signoz_traces.span_attributes_keys ON CLUSTER {{.SIGNOZ_CLUSTER}} (
    tagKey LowCardinality(String) CODEC(ZSTD(1)),
    tagType Enum('tag', 'resource') CODEC(ZSTD(1)),
    dataType Enum('string', 'bool', 'float64') CODEC(ZSTD(1)),
    isColumn bool CODEC(ZSTD(1)),
) ENGINE ReplacingMergeTree
ORDER BY (tagKey, tagType, dataType, isColumn);

CREATE TABLE IF NOT EXISTS signoz_traces.distributed_span_attributes_keys ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_traces.span_attributes_keys
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_traces", span_attributes_keys, cityHash64(rand()));
