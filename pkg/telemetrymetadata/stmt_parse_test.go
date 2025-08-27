package telemetrymetadata

import (
	"slices"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func TestExtractFieldKeysFromTblStatement(t *testing.T) {

	var statement = `CREATE TABLE signoz_logs.logs_v2
	(
		` + "`ts_bucket_start`" + ` UInt64 CODEC(DoubleDelta, LZ4),
		` + "`resource_fingerprint`" + ` String CODEC(ZSTD(1)),
		` + "`timestamp`" + ` UInt64 CODEC(DoubleDelta, LZ4),
		` + "`observed_timestamp`" + ` UInt64 CODEC(DoubleDelta, LZ4),
		` + "`id`" + ` String CODEC(ZSTD(1)),
		` + "`trace_id`" + ` String CODEC(ZSTD(1)),
		` + "`span_id`" + ` String CODEC(ZSTD(1)),
		` + "`trace_flags`" + ` UInt32,
		` + "`severity_text`" + ` LowCardinality(String) CODEC(ZSTD(1)),
		` + "`severity_number`" + ` UInt8,
		` + "`body`" + ` String CODEC(ZSTD(2)),
		` + "`attributes_string`" + ` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
		` + "`attributes_number`" + ` Map(LowCardinality(String), Float64) CODEC(ZSTD(1)),
		` + "`attributes_bool`" + ` Map(LowCardinality(String), Bool) CODEC(ZSTD(1)),
		` + "`resources_string`" + ` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
		` + "`scope_name`" + ` String CODEC(ZSTD(1)),
		` + "`scope_version`" + ` String CODEC(ZSTD(1)),
		` + "`scope_string`" + ` Map(LowCardinality(String), String) CODEC(ZSTD(1)),
		` + "`attribute_number_input_size`" + ` Int64 DEFAULT attributes_number['input_size'] CODEC(ZSTD(1)),
		` + "`attribute_number_input_size_exists`" + ` Bool DEFAULT if(mapContains(attributes_number, 'input_size') != 0, true, false) CODEC(ZSTD(1)),
		` + "`attribute_string_log$$iostream`" + ` String DEFAULT attributes_string['log.iostream'] CODEC(ZSTD(1)),
		` + "`attribute_string_log$$iostream_exists`" + ` Bool DEFAULT if(mapContains(attributes_string, 'log.iostream') != 0, true, false) CODEC(ZSTD(1)),
		` + "`attribute_string_log$$file$$path`" + ` String DEFAULT attributes_string['log.file.path'] CODEC(ZSTD(1)),
		` + "`attribute_string_log$$file$$path_exists`" + ` Bool DEFAULT if(mapContains(attributes_string, 'log.file.path') != 0, true, false) CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$cluster$$name`" + ` String DEFAULT resources_string['k8s.cluster.name'] CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$cluster$$name_exists`" + ` Bool DEFAULT if(mapContains(resources_string, 'k8s.cluster.name') != 0, true, false) CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$namespace$$name`" + ` String DEFAULT resources_string['k8s.namespace.name'] CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$namespace$$name_exists`" + ` Bool DEFAULT if(mapContains(resources_string, 'k8s.namespace.name') != 0, true, false) CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$pod$$name`" + ` String DEFAULT resources_string['k8s.pod.name'] CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$pod$$name_exists`" + ` Bool DEFAULT if(mapContains(resources_string, 'k8s.pod.name') != 0, true, false) CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$node$$name`" + ` String DEFAULT resources_string['k8s.node.name'] CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$node$$name_exists`" + ` Bool DEFAULT if(mapContains(resources_string, 'k8s.node.name') != 0, true, false) CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$container$$name`" + ` String DEFAULT resources_string['k8s.container.name'] CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$container$$name_exists`" + ` Bool DEFAULT if(mapContains(resources_string, 'k8s.container.name') != 0, true, false) CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$deployment$$name`" + ` String DEFAULT resources_string['k8s.deployment.name'] CODEC(ZSTD(1)),
		` + "`resource_string_k8s$$deployment$$name_exists`" + ` Bool DEFAULT if(mapContains(resources_string, 'k8s.deployment.name') != 0, true, false) CODEC(ZSTD(1)),
		` + "`attribute_string_processor`" + ` String DEFAULT attributes_string['processor'] CODEC(ZSTD(1)),
		` + "`attribute_string_processor_exists`" + ` Bool DEFAULT if(mapContains(attributes_string, 'processor') != 0, true, false) CODEC(ZSTD(1)),
		INDEX body_idx lower(body) TYPE ngrambf_v1(4, 60000, 5, 0) GRANULARITY 1,
		INDEX id_minmax id TYPE minmax GRANULARITY 1,
		INDEX severity_number_idx severity_number TYPE set(25) GRANULARITY 4,
		INDEX severity_text_idx severity_text TYPE set(25) GRANULARITY 4,
		INDEX trace_flags_idx trace_flags TYPE bloom_filter GRANULARITY 4,
		INDEX scope_name_idx scope_name TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4,
		INDEX ` + "`resource_string_k8s$$cluster$$name_idx`" + ` ` + "`resource_string_k8s$$cluster$$name`" + ` TYPE bloom_filter(0.01) GRANULARITY 64,
		INDEX ` + "`resource_string_k8s$$namespace$$name_idx`" + ` ` + "`resource_string_k8s$$namespace$$name`" + ` TYPE bloom_filter(0.01) GRANULARITY 64,
		INDEX ` + "`resource_string_k8s$$pod$$name_idx`" + ` ` + "`resource_string_k8s$$pod$$name`" + ` TYPE bloom_filter(0.01) GRANULARITY 64,
		INDEX ` + "`resource_string_k8s$$node$$name_idx`" + ` ` + "`resource_string_k8s$$node$$name`" + ` TYPE bloom_filter(0.01) GRANULARITY 64,
		INDEX ` + "`resource_string_k8s$$container$$name_idx`" + ` ` + "`resource_string_k8s$$container$$name`" + ` TYPE bloom_filter(0.01) GRANULARITY 64,
		INDEX ` + "`resource_string_k8s$$deployment$$name_idx`" + ` ` + "`resource_string_k8s$$deployment$$name`" + ` TYPE bloom_filter(0.01) GRANULARITY 64,
		INDEX attribute_string_processor_idx attribute_string_processor TYPE bloom_filter(0.01) GRANULARITY 64
	)
	ENGINE = ReplicatedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
	PARTITION BY toDate(timestamp / 1000000000)
	ORDER BY (ts_bucket_start, resource_fingerprint, severity_text, timestamp, id)
	TTL toDateTime(timestamp / 1000000000) + toIntervalSecond(2592000)
	SETTINGS ttl_only_drop_parts = 1, index_granularity = 8192`

	keys, err := ExtractFieldKeysFromTblStatement(statement)
	if err != nil {
		t.Fatalf("failed to extract field keys from tbl statement: %v", err)
	}

	// some expected keys
	expectedKeys := []*telemetrytypes.TelemetryFieldKey{
		{
			Name:          "k8s.pod.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:          "k8s.cluster.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:          "k8s.namespace.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:          "k8s.deployment.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:          "k8s.node.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:          "k8s.container.name",
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:          "processor",
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:          "input_size",
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
			Materialized:  true,
		},
		{
			Name:          "log.iostream",
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
		{
			Name:          "log.file.path",
			FieldContext:  telemetrytypes.FieldContextAttribute,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  true,
		},
	}

	for _, key := range expectedKeys {
		if !slices.ContainsFunc(keys, func(k *telemetrytypes.TelemetryFieldKey) bool {
			return k.Name == key.Name && k.FieldContext == key.FieldContext && k.FieldDataType == key.FieldDataType && k.Materialized == key.Materialized
		}) {
			t.Errorf("expected key %v not found", key)
		}
	}
}
