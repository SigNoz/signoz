ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} DROP column IF EXISTS attributes_bool_key;

ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} DROP column IF EXISTS attributes_bool_value;

ALTER TABLE signoz_logs.distributed_logs ON CLUSTER {{.SIGNOZ_CLUSTER}} DROP column IF EXISTS attributes_bool_key;

ALTER TABLE signoz_logs.distributed_logs ON CLUSTER {{.SIGNOZ_CLUSTER}} DROP column IF EXISTS attributes_bool_value;

DROP TABLE IF EXISTS signoz_logs.attribute_keys_bool_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};