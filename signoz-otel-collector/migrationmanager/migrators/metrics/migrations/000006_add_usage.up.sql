CREATE TABLE IF NOT EXISTS signoz_metrics.usage ON CLUSTER {{ .SIGNOZ_CLUSTER }} (
    tenant String,
    collector_id String,
    exporter_id String,
    timestamp DateTime,
    data String
) ENGINE MergeTree()
ORDER BY (tenant, collector_id, exporter_id, timestamp)
TTL timestamp + INTERVAL 3 DAY;


CREATE TABLE IF NOT EXISTS signoz_metrics.distributed_usage  ON CLUSTER {{.SIGNOZ_CLUSTER}} 
    AS signoz_metrics.usage
    ENGINE = Distributed({{ .SIGNOZ_CLUSTER }}, signoz_metrics, usage, cityHash64(rand()));