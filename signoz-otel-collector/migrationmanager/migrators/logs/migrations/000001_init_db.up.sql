CREATE TABLE IF NOT EXISTS signoz_logs.logs ON CLUSTER {{.SIGNOZ_CLUSTER}} (
	timestamp UInt64 CODEC(DoubleDelta, LZ4),
	observed_timestamp UInt64 CODEC(DoubleDelta, LZ4),
	id String CODEC(ZSTD(1)),
	trace_id String CODEC(ZSTD(1)),
	span_id String CODEC(ZSTD(1)),
	trace_flags UInt32,
	severity_text LowCardinality(String) CODEC(ZSTD(1)),
	severity_number UInt8,
	body String CODEC(ZSTD(2)),
	resources_string_key Array(String) CODEC(ZSTD(1)),
	resources_string_value Array(String) CODEC(ZSTD(1)),
	attributes_string_key Array(String) CODEC(ZSTD(1)),
	attributes_string_value Array(String) CODEC(ZSTD(1)),
	attributes_int64_key Array(String) CODEC(ZSTD(1)),
	attributes_int64_value Array(Int64) CODEC(ZSTD(1)),
	attributes_float64_key Array(String) CODEC(ZSTD(1)),
	attributes_float64_value Array(Float64) CODEC(ZSTD(1)),
	INDEX body_idx body TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4
) ENGINE MergeTree
PARTITION BY toDate(timestamp / 1000000000)
ORDER BY (timestamp, id)
TTL toDateTime(timestamp / 1000000000) + INTERVAL 1296000 SECOND DELETE;



CREATE TABLE IF NOT EXISTS signoz_logs.logs_atrribute_keys ON CLUSTER {{.SIGNOZ_CLUSTER}} (
name String,
datatype String
)ENGINE = ReplacingMergeTree
ORDER BY (name, datatype);



CREATE TABLE IF NOT EXISTS signoz_logs.logs_resource_keys ON CLUSTER {{.SIGNOZ_CLUSTER}} (
name String,
datatype String
)ENGINE = ReplacingMergeTree
ORDER BY (name, datatype);


CREATE MATERIALIZED VIEW IF NOT EXISTS  atrribute_keys_string_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}} TO signoz_logs.logs_atrribute_keys AS
SELECT
distinct arrayJoin(attributes_string_key) as name, 'String' datatype
FROM signoz_logs.logs
ORDER BY name;

CREATE MATERIALIZED VIEW IF NOT EXISTS  atrribute_keys_int64_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}} TO signoz_logs.logs_atrribute_keys AS
SELECT
distinct arrayJoin(attributes_int64_key) as name, 'Int64' datatype
FROM signoz_logs.logs
ORDER BY  name;

CREATE MATERIALIZED VIEW IF NOT EXISTS  atrribute_keys_float64_final_mv ON CLUSTER {{.SIGNOZ_CLUSTER}} TO signoz_logs.logs_atrribute_keys AS
SELECT
distinct arrayJoin(attributes_float64_key) as name, 'Float64' datatype
FROM signoz_logs.logs
ORDER BY  name;

CREATE MATERIALIZED VIEW IF NOT EXISTS  resource_keys_string_final_mv  ON CLUSTER {{.SIGNOZ_CLUSTER}} TO signoz_logs.logs_resource_keys AS
SELECT
distinct arrayJoin(resources_string_key) as name, 'String' datatype
FROM signoz_logs.logs
ORDER BY  name;