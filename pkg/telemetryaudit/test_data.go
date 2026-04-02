package telemetryaudit

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func buildCompleteFieldKeyMap() map[string][]*telemetrytypes.TelemetryFieldKey {
	return map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name": {
			{
				Name:          "service.name",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"signoz.audit.action": {
			{
				Name:          "signoz.audit.action",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"signoz.audit.outcome": {
			{
				Name:          "signoz.audit.outcome",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"signoz.audit.principal.email": {
			{
				Name:          "signoz.audit.principal.email",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"signoz.audit.principal.id": {
			{
				Name:          "signoz.audit.principal.id",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"signoz.audit.principal.type": {
			{
				Name:          "signoz.audit.principal.type",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"signoz.audit.resource.name": {
			{
				Name:          "signoz.audit.resource.name",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"signoz.audit.resource.id": {
			{
				Name:          "signoz.audit.resource.id",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				Materialized:  true,
			},
		},
		"signoz.audit.action_category": {
			{
				Name:          "signoz.audit.action_category",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"signoz.audit.error.type": {
			{
				Name:          "signoz.audit.error.type",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"signoz.audit.error.code": {
			{
				Name:          "signoz.audit.error.code",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.request.method": {
			{
				Name:          "http.request.method",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		"http.response.status_code": {
			{
				Name:          "http.response.status_code",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextAttribute,
				FieldDataType: telemetrytypes.FieldDataTypeInt64,
			},
		},
	}
}
