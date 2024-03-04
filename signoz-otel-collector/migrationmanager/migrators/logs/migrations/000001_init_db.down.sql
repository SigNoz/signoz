DROP TABLE IF EXISTS signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.logs_atrribute_keys ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.logs_resource_keys ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.resource_keys_string_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.atrribute_keys_float64_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.atrribute_keys_int64_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP TABLE IF EXISTS signoz_logs.atrribute_keys_string_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};