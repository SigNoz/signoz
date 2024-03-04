DROP TABLE IF EXISTS signoz_metrics.usage on cluster {{ .SIGNOZ_CLUSTER }};
DROP TABLE IF EXISTS signoz_metrics.distributed_usage on cluster {{ .SIGNOZ_CLUSTER }};