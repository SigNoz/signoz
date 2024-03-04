DROP TABLE IF EXISTS signoz_logs.distributed_logs ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.distributed_logs_atrribute_keys ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.distributed_logs_resource_keys ON CLUSTER {{.SIGNOZ_CLUSTER}};