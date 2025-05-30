package telemetrymetrics

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
	}
	for _, keys := range keysMap {
		for _, key := range keys {
			key.Signal = telemetrytypes.SignalMetrics
		}
	}
	return keysMap
}
