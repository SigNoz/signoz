DROP TABLE IF EXISTS signoz_traces.usage on cluster {{ .SIGNOZ_CLUSTER }};
DROP TABLE IF EXISTS signoz_traces.distributed_usage on cluster {{ .SIGNOZ_CLUSTER }};