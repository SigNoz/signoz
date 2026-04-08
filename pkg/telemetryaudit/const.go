package telemetryaudit

import (
	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
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
	EventNameColumn         = "event_name"
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
	ResourceColumn         = "resource"
	ScopeStringColumn      = "scope_string"
)

var (
	DefaultFullTextColumn = &telemetrytypes.TelemetryFieldKey{
		Name:          "body",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextLog,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}

	IntrinsicFields = map[string]telemetrytypes.TelemetryFieldKey{
		"body": {
			Name:          "body",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"trace_id": {
			Name:          "trace_id",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"span_id": {
			Name:          "span_id",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"trace_flags": {
			Name:          "trace_flags",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
		},
		"severity_text": {
			Name:          "severity_text",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"severity_number": {
			Name:          "severity_number",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
		},
		"event_name": {
			Name:          "event_name",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
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

var auditLogColumns = map[string]*schema.Column{
	"ts_bucket_start":      {Name: "ts_bucket_start", Type: schema.ColumnTypeUInt64},
	"resource_fingerprint": {Name: "resource_fingerprint", Type: schema.ColumnTypeString},
	"timestamp":            {Name: "timestamp", Type: schema.ColumnTypeUInt64},
	"observed_timestamp":   {Name: "observed_timestamp", Type: schema.ColumnTypeUInt64},
	"id":                   {Name: "id", Type: schema.ColumnTypeString},
	"trace_id":             {Name: "trace_id", Type: schema.ColumnTypeString},
	"span_id":              {Name: "span_id", Type: schema.ColumnTypeString},
	"trace_flags":          {Name: "trace_flags", Type: schema.ColumnTypeUInt32},
	"severity_text":        {Name: "severity_text", Type: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}},
	"severity_number":      {Name: "severity_number", Type: schema.ColumnTypeUInt8},
	"body":                 {Name: "body", Type: schema.ColumnTypeString},
	"attributes_string":    {Name: "attributes_string", Type: schema.MapColumnType{KeyType: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}, ValueType: schema.ColumnTypeString}},
	"attributes_number":    {Name: "attributes_number", Type: schema.MapColumnType{KeyType: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}, ValueType: schema.ColumnTypeFloat64}},
	"attributes_bool":      {Name: "attributes_bool", Type: schema.MapColumnType{KeyType: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}, ValueType: schema.ColumnTypeBool}},
	"resource":             {Name: "resource", Type: schema.JSONColumnType{}},
	"event_name":           {Name: "event_name", Type: schema.ColumnTypeString},
	"scope_name":           {Name: "scope_name", Type: schema.ColumnTypeString},
	"scope_version":        {Name: "scope_version", Type: schema.ColumnTypeString},
	"scope_string":         {Name: "scope_string", Type: schema.MapColumnType{KeyType: schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString}, ValueType: schema.ColumnTypeString}},
}
