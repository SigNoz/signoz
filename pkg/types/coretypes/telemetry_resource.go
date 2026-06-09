package coretypes

// TelemetryResourceForSignalSource maps a query's signal + source to its
// telemetry resource. source takes precedence for the specialized kinds (audit
// logs, meter metrics); otherwise the signal decides. ok is false for an
// unknown/unspecified combination (e.g. a PromQL/ClickHouse query with no
// signal).
func TelemetryResourceForSignalSource(signal, source string) (Resource, bool) {
	switch source {
	case "audit":
		return ResourceTelemetryResourceAuditLogs, true
	case "meter":
		return ResourceTelemetryResourceMeterMetrics, true
	}

	switch signal {
	case "logs":
		return ResourceTelemetryResourceLogs, true
	case "traces":
		return ResourceTelemetryResourceTraces, true
	case "metrics":
		return ResourceTelemetryResourceMetrics, true
	default:
		return nil, false
	}
}
