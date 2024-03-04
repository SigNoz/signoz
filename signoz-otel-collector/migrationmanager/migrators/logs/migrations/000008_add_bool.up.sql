ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} add column IF NOT EXISTS attributes_bool_key Array(String) CODEC(ZSTD(1));

ALTER TABLE signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} add column IF NOT EXISTS attributes_bool_value Array(Bool) CODEC(ZSTD(1));

ALTER TABLE signoz_logs.distributed_logs ON CLUSTER {{.SIGNOZ_CLUSTER}} add column IF NOT EXISTS attributes_bool_key Array(String) CODEC(ZSTD(1));

ALTER TABLE signoz_logs.distributed_logs ON CLUSTER {{.SIGNOZ_CLUSTER}} add column IF NOT EXISTS attributes_bool_value Array(Bool) CODEC(ZSTD(1));

CREATE MATERIALIZED VIEW IF NOT EXISTS  signoz_logs.attribute_keys_bool_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}} TO signoz_logs.logs_attribute_keys AS
SELECT
distinct arrayJoin(attributes_bool_key) as name, 'Bool' datatype
FROM signoz_logs.logs
ORDER BY name;