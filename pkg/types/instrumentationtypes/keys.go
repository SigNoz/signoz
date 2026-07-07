package instrumentationtypes

import semconv "go.opentelemetry.io/collector/semconv/v1.6.1"

// Log comment / context keys for query observability.
// Names align with OpenTelemetry semantic conventions where applicable
// (https://pkg.go.dev/go.opentelemetry.io/otel/semconv); custom keys are namespaced.
const (
	// CodeFunctionName is the fully-qualified function or method name (OTel code.function.name).
	CodeFunctionName = semconv.AttributeCodeFunction
	// CodeNamespace is the logical module or component name (e.g. "dashboard", "anomaly").
	CodeNamespace = semconv.AttributeCodeNamespace
	// TelemetrySignal is the telemetry signal type: "traces", "logs", or "metrics".
	TelemetrySignal = "telemetry.signal"
	// QueryDuration is the query time-range bucket label (e.g. "<1h", "<24h").
	QueryDuration = "query.duration"
	// PanelType is the panel type: "timeseries", "list", "value".
	PanelType = "panel.type"
	// QueryType is the query type: "promql", "clickhouse_sql", "builder_query".
	QueryType = "query.type"
)
