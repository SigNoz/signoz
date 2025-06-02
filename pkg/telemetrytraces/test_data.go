package telemetrytraces

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func buildCompleteFieldKeyMap() map[string][]*telemetrytypes.TelemetryFieldKey {
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
	}
	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalTraces
		}
	}
	return keysMap
}
