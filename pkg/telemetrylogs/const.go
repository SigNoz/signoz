package telemetrylogs

var (
	BodyJSONStringSearchPrefix = `body.`
	IntrinsicFields            = []string{"timestamp", "body", "trace_id", "span_id", "trace_flags", "severity_text", "severity_number"}
)
