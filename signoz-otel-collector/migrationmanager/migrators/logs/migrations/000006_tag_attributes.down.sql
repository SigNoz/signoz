DROP TABLE IF EXISTS signoz_logs.distributed_tag_attributes ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.tag_attributes ON CLUSTER {{.SIGNOZ_CLUSTER}};