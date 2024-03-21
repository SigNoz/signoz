CREATE TABLE IF NOT EXISTS signoz_traces.top_level_operations ON CLUSTER {{.SIGNOZ_CLUSTER}} (
    name LowCardinality(String) CODEC(ZSTD(1)),
    serviceName LowCardinality(String) CODEC(ZSTD(1))
) ENGINE ReplacingMergeTree
ORDER BY (serviceName, name);


CREATE MATERIALIZED VIEW IF NOT EXISTS signoz_traces.sub_root_operations ON CLUSTER {{.SIGNOZ_CLUSTER}} 
TO signoz_traces.top_level_operations
AS SELECT DISTINCT
    name,
    serviceName
FROM signoz_traces.signoz_index_v2 AS A, signoz_traces.signoz_index_v2 AS B
WHERE (A.serviceName != B.serviceName) AND (A.parentSpanID = B.spanID);

CREATE MATERIALIZED VIEW IF NOT EXISTS signoz_traces.root_operations ON CLUSTER {{.SIGNOZ_CLUSTER}} 
TO signoz_traces.top_level_operations
AS SELECT DISTINCT
    name,
    serviceName
FROM signoz_traces.signoz_index_v2
WHERE parentSpanID = '';
