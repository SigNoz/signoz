-- We are dropping logs_attribute_keys as we are renaming logs_atrribute_keys in the next line
DROP TABLE IF EXISTS signoz_logs.logs_attribute_keys on CLUSTER {{.SIGNOZ_CLUSTER}};

RENAME TABLE IF EXISTS signoz_logs.logs_atrribute_keys TO signoz_logs.logs_attribute_keys on CLUSTER {{.SIGNOZ_CLUSTER}};


-- Materialized view
DROP VIEW IF EXISTS atrribute_keys_string_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP VIEW IF EXISTS atrribute_keys_int64_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};
DROP VIEW IF EXISTS atrribute_keys_float64_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}};

CREATE MATERIALIZED VIEW IF NOT EXISTS  attribute_keys_string_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}} TO signoz_logs.logs_attribute_keys AS
SELECT
distinct arrayJoin(attributes_string_key) as name, 'String' datatype
FROM signoz_logs.logs
ORDER BY name;

CREATE MATERIALIZED VIEW IF NOT EXISTS  attribute_keys_int64_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}} TO signoz_logs.logs_attribute_keys AS
SELECT
distinct arrayJoin(attributes_int64_key) as name, 'Int64' datatype
FROM signoz_logs.logs
ORDER BY  name;

CREATE MATERIALIZED VIEW IF NOT EXISTS  attribute_keys_float64_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}} TO signoz_logs.logs_attribute_keys AS
SELECT
distinct arrayJoin(attributes_float64_key) as name, 'Float64' datatype
FROM signoz_logs.logs
ORDER BY  name;


-- Distributed table
DROP TABLE IF EXISTS signoz_logs.distributed_logs_atrribute_keys ON CLUSTER {{.SIGNOZ_CLUSTER}};

CREATE TABLE IF NOT EXISTS signoz_logs.distributed_logs_attribute_keys  ON CLUSTER {{.SIGNOZ_CLUSTER}} AS signoz_logs.logs_attribute_keys
ENGINE = Distributed("{{.SIGNOZ_CLUSTER}}", "signoz_logs", logs_attribute_keys, cityHash64(datatype));