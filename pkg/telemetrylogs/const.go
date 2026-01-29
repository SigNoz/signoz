package telemetrylogs

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/constants"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (

	// Internal Columns
	LogsV2IDColumn                   = "id"
	LogsV2TimestampBucketStartColumn = "ts_bucket_start"
	LogsV2ResourceFingerPrintColumn  = "resource_fingerprint"

	// Intrinsic Columns
	LogsV2TimestampColumn         = "timestamp"
	LogsV2ObservedTimestampColumn = "observed_timestamp"
	LogsV2BodyColumn              = "body"
	LogsV2BodyJSONColumn          = constants.BodyJSONColumn
	LogsV2BodyPromotedColumn      = constants.BodyPromotedColumn
	LogsV2TraceIDColumn           = "trace_id"
	LogsV2SpanIDColumn            = "span_id"
	LogsV2TraceFlagsColumn        = "trace_flags"
	LogsV2SeverityTextColumn      = "severity_text"
	LogsV2SeverityNumberColumn    = "severity_number"
	LogsV2ScopeNameColumn         = "scope_name"
	LogsV2ScopeVersionColumn      = "scope_version"

	// Contextual Columns
	LogsV2AttributesStringColumn = "attributes_string"
	LogsV2AttributesNumberColumn = "attributes_number"
	LogsV2AttributesBoolColumn   = "attributes_bool"
	LogsV2ResourcesStringColumn  = "resources_string"
	LogsV2ScopeStringColumn      = "scope_string"

	BodyJSONColumnPrefix     = constants.BodyJSONColumnPrefix
	BodyPromotedColumnPrefix = constants.BodyPromotedColumnPrefix
)

var (
	DefaultFullTextColumn = &telemetrytypes.TelemetryFieldKey{
		Name:          "body",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextLog,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	IntrinsicFields = map[string]func() []telemetrytypes.TelemetryFieldKey{
		"body": buildBodyIntrinsicFields,
		"trace_id": func() []telemetrytypes.TelemetryFieldKey {
			return []telemetrytypes.TelemetryFieldKey{{
				Name:          "trace_id",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}}
		},
		"span_id": func() []telemetrytypes.TelemetryFieldKey {
			return []telemetrytypes.TelemetryFieldKey{{
				Name:          "span_id",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}}
		},
		"trace_flags": func() []telemetrytypes.TelemetryFieldKey {
			return []telemetrytypes.TelemetryFieldKey{{
				Name:          "trace_flags",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			}}
		},
		"severity_text": func() []telemetrytypes.TelemetryFieldKey {
			return []telemetrytypes.TelemetryFieldKey{{
				Name:          "severity_text",
				Description:   "Log level. Learn more [here](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitytext)",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}}
		},
		"severity_number": func() []telemetrytypes.TelemetryFieldKey {
			return []telemetrytypes.TelemetryFieldKey{{
				Name:          "severity_number",
				Description:   "Numerical value of the severity. Learn more [here](https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber)",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeNumber,
			}}
		},
		"scope_name": func() []telemetrytypes.TelemetryFieldKey {
			return []telemetrytypes.TelemetryFieldKey{{
				Name:          "scope_name",
				Description:   "Logger name. Learn more about instrumentation scope [here](https://opentelemetry.io/docs/concepts/instrumentation-scope/)",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextScope,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}}
		},
		"scope_version": func() []telemetrytypes.TelemetryFieldKey {
			return []telemetrytypes.TelemetryFieldKey{{
				Name:          "scope_version",
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextScope,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			}}
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

	PsuedoIntrinsicFieldsInvalidOps = map[string][]qbtypes.FilterOperator{
		jsonMergeExpr(): {
			qbtypes.FilterOperatorExists,
			qbtypes.FilterOperatorNotExists,
		},
	}
)

func jsonMergeExpr() string {
	jsonStringExpressions := []string{}
	for _, key := range []string{LogsV2BodyJSONColumn, LogsV2BodyPromotedColumn} {
		jsonStringExpressions = append(jsonStringExpressions, fmt.Sprintf("toString(%s)", key))
	}

	return fmt.Sprintf("jsonMergePatch(%s)", strings.Join(jsonStringExpressions, ", "))
}

// bodyExpression returns the core ClickHouse expression representing the
// conceptual "body" field when JSON body querying is enabled.
//
// NOTE: This intentionally does NOT include an alias so it can be reused
// both in SELECT lists (with an "AS body" suffix) and in WHERE clauses.
func bodyExpression() string {
	if !querybuilder.BodyJSONQueryEnabled {
		return LogsV2BodyColumn
	}
	return fmt.Sprintf("if(empty(%s), %s, %s)", LogsV2BodyColumn, LogsV2BodyColumn, jsonMergeExpr())
}

func bodyAliasExpression() string {
	if !querybuilder.BodyJSONQueryEnabled {
		return LogsV2BodyColumn
	}

	return fmt.Sprintf("%s as body", bodyExpression())
}

func buildBodyIntrinsicFields() []telemetrytypes.TelemetryFieldKey {
	base := []telemetrytypes.TelemetryFieldKey{{
		Name:          "body",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextLog,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}}

	if querybuilder.BodyJSONQueryEnabled {
		base = append(base, telemetrytypes.TelemetryFieldKey{
			Name:          LogsV2BodyJSONColumn,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  telemetrytypes.FieldContextLog,
			FieldDataType: telemetrytypes.FieldDataTypeJSON,
			LogicalName:   "body",
		},
			telemetrytypes.TelemetryFieldKey{
				Name:          LogsV2BodyPromotedColumn,
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeJSON,
				LogicalName:   "body",
			},
			telemetrytypes.TelemetryFieldKey{
				Name:          jsonMergeExpr(),
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextLog,
				FieldDataType: telemetrytypes.FieldDataTypeString,
				LogicalName:   "body",
			},
		)
	}

	return base
}
