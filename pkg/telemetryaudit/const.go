package telemetryaudit

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	// Internal Columns.
	IDColumn                   = "id"
	TimestampBucketStartColumn = "ts_bucket_start"
	ResourceFingerPrintColumn  = "resource_fingerprint"

	// Intrinsic Columns.
	TimestampColumn         = "timestamp"
	ObservedTimestampColumn = "observed_timestamp"
	BodyColumn              = "body"
	TraceIDColumn           = "trace_id"
	SpanIDColumn            = "span_id"
	TraceFlagsColumn        = "trace_flags"
	SeverityTextColumn      = "severity_text"
	SeverityNumberColumn    = "severity_number"
	ScopeNameColumn         = "scope_name"
	ScopeVersionColumn      = "scope_version"

	// Contextual Columns.
	AttributesStringColumn = "attributes_string"
	AttributesNumberColumn = "attributes_number"
	AttributesBoolColumn   = "attributes_bool"
	ResourcesStringColumn  = "resources_string"
	ScopeStringColumn      = "scope_string"
)

var (
	DefaultFullTextColumn = &telemetrytypes.TelemetryFieldKey{
		Name:          "body",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:   telemetrytypes.FieldContextLog,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}

	IntrinsicFields = map[string]telemetrytypes.TelemetryFieldKey{
		"body": {
			Name:          "body",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:   telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"trace_id": {
			Name:          "trace_id",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:   telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"span_id": {
			Name:          "span_id",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:   telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"trace_flags": {
			Name:          "trace_flags",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:   telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
		},
		"severity_text": {
			Name:          "severity_text",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:   telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"severity_number": {
			Name:          "severity_number",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:   telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
		},
	}

	DefaultSortingOrder = []qbtypes.OrderBy{
		{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: TimestampColumn,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		},
		{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: IDColumn,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		},
	}
)
