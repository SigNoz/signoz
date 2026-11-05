package audittelemetryschema

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

	// Contextual Columns.
	AttributesColumn = "attributes"
	ResourceColumn   = "resource"
	ScopeColumn      = "scope"
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

	// ResourceFields are the resource keys the audit writer emits, so a bare name resolves to resource.
	ResourceFields = map[string]telemetrytypes.TelemetryFieldKey{
		"service.name":                        newResourceField("service.name"),
		"service.version":                     newResourceField("service.version"),
		"signoz.audit.resource.kind":          newResourceField("signoz.audit.resource.kind"),
		"signoz.audit.resource.id":            newResourceField("signoz.audit.resource.id"),
		"signoz.audit.resource.object":        newResourceField("signoz.audit.resource.object"),
		"signoz.audit.resource.target.kind":   newResourceField("signoz.audit.resource.target.kind"),
		"signoz.audit.resource.target.id":     newResourceField("signoz.audit.resource.target.id"),
		"signoz.audit.resource.target.object": newResourceField("signoz.audit.resource.target.object"),
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
	"body":                 {Name: "body", Type: schema.JSONColumnType{}},
	"scope":                {Name: "scope", Type: schema.JSONColumnType{}},
	"attributes":           {Name: "attributes", Type: schema.JSONColumnType{}},
	"resource":             {Name: "resource", Type: schema.JSONColumnType{}},
	"event_name":           {Name: "event_name", Type: schema.ColumnTypeString},
}

const (
	DBName                      = "signoz_audit"
	AuditLogsTableName          = "distributed_logs"
	AuditLogsLocalTableName     = "logs"
	TagAttributesTableName      = "distributed_tag_attributes"
	TagAttributesLocalTableName = "tag_attributes"
	LogAttributeKeysTblName     = "distributed_logs_attribute_keys"
	LogResourceKeysTblName      = "distributed_logs_resource_keys"
	LogsResourceTableName       = "distributed_logs_resource"
)

func newResourceField(name string) telemetrytypes.TelemetryFieldKey {
	return telemetrytypes.TelemetryFieldKey{
		Name:          name,
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextResource,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
}
