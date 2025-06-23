package telemetrylogs

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

var (
	DefaultFullTextColumn = &telemetrytypes.TelemetryFieldKey{
		Name:          "body",
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  telemetrytypes.FieldContextLog,
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	BodyJSONStringSearchPrefix = `body.`
	IntrinsicFields            = []string{
		"body", "trace_id", "span_id", "trace_flags", "severity_text", "severity_number", "scope_name", "scope_version",
	}
)
