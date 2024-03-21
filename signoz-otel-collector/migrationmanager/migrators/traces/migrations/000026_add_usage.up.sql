CREATE TABLE IF NOT EXISTS signoz_traces.usage ON CLUSTER {{ .SIGNOZ_CLUSTER }} (
    tenant String,
    collector_id String,
    exporter_id String,
    timestamp DateTime,
    data String
) ENGINE MergeTree()
ORDER BY (tenant, collector_id, exporter_id, timestamp)
TTL timestamp + INTERVAL 3 DAY;


CREATE TABLE IF NOT EXISTS signoz_traces.distributed_usage  ON CLUSTER {{.SIGNOZ_CLUSTER}}
    AS signoz_traces.usage
    ENGINE = Distributed({{ .SIGNOZ_CLUSTER }}, signoz_traces, usage, cityHash64(rand()));