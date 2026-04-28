package telemetrylogs

import (
	"fmt"

	"github.com/SigNoz/signoz-otel-collector/constants"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (

	// Internal Columns.
	LogsV2IDColumn                   = "id"
	LogsV2TimestampBucketStartColumn = "ts_bucket_start"
	LogsV2ResourceFingerPrintColumn  = "resource_fingerprint"

	// Intrinsic Columns.
	LogsV2TimestampColumn         = "timestamp"
	LogsV2ObservedTimestampColumn = "observed_timestamp"
	LogsV2BodyColumn              = "body"
	LogsV2BodyV2Column            = constants.BodyV2Column
	LogsV2BodyPromotedColumn      = constants.BodyPromotedColumn
	LogsV2TraceIDColumn           = "trace_id"
	LogsV2SpanIDColumn            = "span_id"
	LogsV2TraceFlagsColumn        = "trace_flags"
	LogsV2SeverityTextColumn      = "severity_text"
	LogsV2SeverityNumberColumn    = "severity_number"
	LogsV2ScopeNameColumn         = "scope_name"
	LogsV2ScopeVersionColumn      = "scope_version"

	// Contextual Columns.
	LogsV2AttributesStringColumn = "attributes_string"
	LogsV2AttributesNumberColumn = "attributes_number"
	LogsV2AttributesBoolColumn   = "attributes_bool"
	LogsV2ResourcesStringColumn  = "resources_string"
	LogsV2ScopeStringColumn      = "scope_string"

	BodyV2ColumnPrefix       = constants.BodyV2ColumnPrefix
	BodyPromotedColumnPrefix = constants.BodyPromotedColumnPrefix

	// messageSubColumn is the ClickHouse sub-column that body searches map to
	// when body_json_enabled feature flag is true.
	messageSubField          = "message"
	messageSubColumn         = "body_v2.message"
	bodySearchDefaultWarning = "body searches default to `body.message:string`. Use `body.<key>` to search a different field inside body"
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
			Description:   "Log level. Learn more [here](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitytext)",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"severity_number": {
			Name:          "severity_number",
			Description:   "Numerical value of the severity. Learn more [here](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeNumber,
		},
		"scope_name": {
			Name:          "scope_name",
			Description:   "Logger name. Learn more about instrumentation scope [here](https://opentelemetry.io/docs/concepts/instrumentation-scope/)",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextScope,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
		"scope_version": {
			Name:          "scope_version",
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextScope,
			FieldDataType: telemetrytypes.FieldDataTypeString,
		},
	}

	DefaultLogsV2SortingOrder = []qbtypes.OrderBy{
		{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: LogsV2TimestampColumn,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		},
		{
			Key: qbtypes.OrderByKey{
				TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
					Name: LogsV2IDColumn,
				},
			},
			Direction: qbtypes.OrderDirectionDesc,
		},
	}
)

func bodyAliasExpression(bodyJSONEnabled bool) string {
	if !bodyJSONEnabled {
		return LogsV2BodyColumn
	}

	return fmt.Sprintf("%s as body", LogsV2BodyV2Column)
}
