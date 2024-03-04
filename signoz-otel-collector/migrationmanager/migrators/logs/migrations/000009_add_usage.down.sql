DROP TABLE IF EXISTS signoz_logs.usage on cluster {{ .SIGNOZ_CLUSTER }};
DROP TABLE IF EXISTS signoz_logs.distributed_usage on cluster {{ .SIGNOZ_CLUSTER }};