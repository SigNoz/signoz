package tracestelemetryschema

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func BuildCompleteFieldKeyMap(releaseTime time.Time) map[string][]*telemetrytypes.TelemetryFieldKey {
	keysMap := map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {
			{
				Name:          "service.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.request.method": {
			{
				Name:          "http.request.method",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.response.status_code": {
			{
				Name:          "http.status_code",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"kind_string": {
			{
				Name:          "kind_string",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"metric.max_count": {
			{
				Name:          "metric.max_count",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
			},
		},
		"cart.items_count": {
			{
				Name:          "cart.items_count",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeFloat64,
				Materialized:  true,
			},
		},
		"user.id": {
			{
				Name:          "user.id",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"duration_nano": {
			{
				Name:          "duration_nano",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
			{
				Name:          "duration_nano",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"http.method": {
			{
				Name:          "http.method",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"response_status_code": {
			{
				Name:          "response_status_code",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
		"materialized.key.name": {
			{
				Name:          "materialized.key.name",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"mixed.materialization.key": {
			{
				Name:          "mixed.materialization.key",
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
			{
				Name:          "mixed.materialization.key",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  false,
			},
		},
		"isentrypoint": {
			{
				Name:          "isentrypoint",
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeBool,
			},
		},
		"scope.name": {
			{
				Name:          "scope.name",
				FieldContext:  telemetrytypes.FieldContextScope,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"scope.version": {
			{
				Name:          "scope.version",
				FieldContext:  telemetrytypes.FieldContextScope,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		// both spellings of an enabled semantic-convention family
		"deployment.environment.name": {
			{
				Name:          "deployment.environment.name",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"deployment.environment": {
			{
				Name:          "deployment.environment",
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
	}
	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalTraces
			if key.FieldContext == telemetrytypes.FieldContextResource {
				key.Evolutions = MockEvolutionData(releaseTime)
			}
		}
	}
	return keysMap
}

// MockAttributeEvolutionData returns the attribute-context evolution timeline: the three legacy
// map columns at epoch 0 and the JSON `attributes` column released at releaseTime. Every entry
// is field_name "__all__", so a typed attribute key carries all four; getColumn keeps only its
// own map plus the JSON column and narrowEvolutionsToColumns drops the rest before selection.
func MockAttributeEvolutionData(releaseTime time.Time) []*telemetrytypes.EvolutionEntry {
	entry := func(col, typ string, rt time.Time) *telemetrytypes.EvolutionEntry {
		return &telemetrytypes.EvolutionEntry{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   col,
			ColumnType:   typ,
			FieldContext: telemetrytypes.FieldContextAttribute,
			FieldName:    "__all__",
			ReleaseTime:  rt,
		}
	}
	return []*telemetrytypes.EvolutionEntry{
		entry("attributes_string", "Map(LowCardinality(String), String)", time.Unix(0, 0)),
		entry("attributes_number", "Map(LowCardinality(String), Float64)", time.Unix(0, 0)),
		entry("attributes_bool", "Map(LowCardinality(String), Bool)", time.Unix(0, 0)),
		entry("attributes", "JSON()", releaseTime),
	}
}

// MockEvolutionData returns the canonical resource-column evolution timeline used in tests:
// the legacy resources_string map at epoch 0 and the JSON resource column released at releaseTime.
func MockEvolutionData(releaseTime time.Time) []*telemetrytypes.EvolutionEntry {
	return []*telemetrytypes.EvolutionEntry{
		{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   "resources_string",
			FieldContext: telemetrytypes.FieldContextResource,
			ColumnType:   "Map(LowCardinality(String), String)",
			FieldName:    "__all__",
			ReleaseTime:  time.Unix(0, 0),
		},
		{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   "resource",
			ColumnType:   "JSON()",
			FieldContext: telemetrytypes.FieldContextResource,
			FieldName:    "__all__",
			ReleaseTime:  releaseTime,
		},
	}
}
