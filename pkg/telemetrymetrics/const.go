package telemetrymetrics

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

var IntrinsicFields = []string{
	"__normalized",
	"temporality",
	"metric_name",
	"type",
	"is_monotonic",
}

var IntrinsicMetricFieldDefinitions = map[string]telemetrytypes.TelemetryFieldKey{
	"metric_name": {
		Name:          "metric_name",
		Signal:        telemetrytypes.SignalMetrics,
		FieldContext:  telemetrytypes.FieldContextMetric,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	},
	// "type": {
	// 	Name:          "type",
	// 	Signal:        telemetrytypes.SignalMetrics,
	// 	FieldContext:  telemetrytypes.FieldContextMetric,
	// 	FieldDataType: telemetrytypes.FieldDataTypeString,
	// },
	// "temporality": {
	// 	Name:          "temporality",
	// 	Signal:        telemetrytypes.SignalMetrics,
	// 	FieldContext:  telemetrytypes.FieldContextMetric,
	// 	FieldDataType: telemetrytypes.FieldDataTypeString,
	// },
	// "is_monotonic": {
	// 	Name:          "is_monotonic",
	// 	Signal:        telemetrytypes.SignalMetrics,
	// 	FieldContext:  telemetrytypes.FieldContextMetric,
	// 	FieldDataType: telemetrytypes.FieldDataTypeBool,
	// },
}
