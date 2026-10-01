package instrumentationtypes

import semconv "go.opentelemetry.io/collector/semconv/v1.6.1"

// Log attribute and log comment / context keys for observability.
// Names align with OpenTelemetry semantic conventions where applicable
// (https://pkg.go.dev/go.opentelemetry.io/otel/semconv); custom keys are namespaced.
const (
	// CodeFunctionName is the fully-qualified function or method name (OTel code.function.name).
	CodeFunctionName = "code.function.name"
	// CodeFilePath is the source file path of the call site.
	CodeFilePath = "code.file.path"
	// CodeLineNumber is the source line number of the call site.
	CodeLineNumber = "code.line.number"
	// CodeNamespace is the logical module or component name (e.g. "dashboard", "anomaly").
	CodeNamespace = semconv.AttributeCodeNamespace
	// ExceptionType is the error type (errors.typ).
	ExceptionType = semconv.AttributeExceptionType
	// ExceptionCode is the error code (errors.code); SigNoz-specific, no OTel equivalent.
	ExceptionCode = "exception.code"
	// ExceptionMessage is the error message.
	ExceptionMessage = semconv.AttributeExceptionMessage
	// ExceptionStacktrace is the stacktrace captured at error creation time.
	ExceptionStacktrace = semconv.AttributeExceptionStacktrace
	// TelemetrySignal is the telemetry signal type: "traces", "logs", or "metrics".
	TelemetrySignal = "telemetry.signal"
	// QueryDuration is the query time-range bucket label (e.g. "<1h", "<24h").
	QueryDuration = "query.duration"
	// PanelType is the panel type: "timeseries", "list", "value".
	PanelType = "panel.type"
	// QueryType is the query type: "promql", "clickhouse_sql", "builder_query".
	QueryType = "query.type"
)
