CREATE TABLE IF NOT EXISTS signoz_logs.usage ON CLUSTER {{ .SIGNOZ_CLUSTER }} (
    tenant String,
    collector_id String,
    exporter_id String,
    timestamp DateTime,
    data String
) ENGINE MergeTree()
ORDER BY (tenant, collector_id, exporter_id, timestamp)
TTL timestamp + INTERVAL 3 DAY;


CREATE TABLE IF NOT EXISTS signoz_logs.distributed_usage  ON CLUSTER {{.SIGNOZ_CLUSTER}} 
    AS signoz_logs.usage
    ENGINE = Distributed({{ .SIGNOZ_CLUSTER }}, signoz_logs, usage, cityHash64(rand()));