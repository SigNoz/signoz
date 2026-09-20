package oceanbasetelemetryschema

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var identifier = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_.:/-]*$`)
var prefixPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]{0,39}$`)

func Table(prefix string, signal telemetrytypes.Signal) (string, error) {
	if !prefixPattern.MatchString(prefix) {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid telemetry table prefix")
	}
	var suffix string
	switch signal {
	case telemetrytypes.SignalTraces:
		suffix = "traces"
	case telemetrytypes.SignalLogs:
		suffix = "logs"
	case telemetrytypes.SignalMetrics:
		suffix = "metric_samples"
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported signal %s", signal)
	}
	return "`" + prefix + "_" + suffix + "`", nil
}

// StaticFields maps SigNoz field names to the OTLP exporter's physical columns.
// Other attributes remain in their original resource/record JSON maps.
func StaticFields(signal telemetrytypes.Signal) map[string]string {
	fields := map[string]string{
		"timestamp": "timestamp", "space_id": "space_id", "space.id": "space_id", "ai.vision.space.id": "space_id",
		"user": "user_id", "user_id": "user_id", "user.id": "user_id", "agent_product": "agent_product",
		"service.name": "service_name", "session_id": "session_id", "session.id": "session_id", "gen_ai.conversation.id": "session_id",
		"run_id": "run_id", "agent_name": "agent_name", "scope_name": "scope_name", "scope_version": "scope_version",
		"attributes": "attributes", "resource": "resource_attributes", "resource_attributes": "resource_attributes", "scope_attributes": "scope_attributes", "payload": "payload",
	}
	switch signal {
	case telemetrytypes.SignalTraces:
		for _, field := range []string{"trace_id", "span_id", "parent_span_id", "span_name", "span_kind", "duration_nano", "status_code", "status_message", "events", "links", "start_time_unix_nano", "end_time_unix_nano"} {
			fields[field] = field
		}
		fields["name"] = "span_name"
		fields["duration"] = "duration_nano"
		fields["kind"] = "span_kind"
	case telemetrytypes.SignalLogs:
		for _, field := range []string{"log_id", "trace_id", "span_id", "severity_text", "severity_number", "event_name", "body_json", "observed_time_unix_nano"} {
			fields[field] = field
		}
		fields["id"] = "log_id"
		fields["body"] = "body_text"
	case telemetrytypes.SignalMetrics:
		for _, field := range []string{"sample_id", "metric_name", "metric_type", "value", "count_value", "sum_value", "min_value", "max_value", "unit", "aggregation_temporality", "is_monotonic", "point_data"} {
			fields[field] = field
		}
	}
	return fields
}

func Field(signal telemetrytypes.Signal, key telemetrytypes.TelemetryFieldKey) (string, error) {
	name := key.Name
	if !identifier.MatchString(name) {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid field name %q", name)
	}
	context := key.FieldContext
	for _, prefix := range []string{"resource.attributes.", "resource.", "attributes.", "attribute."} {
		if strings.HasPrefix(name, prefix) {
			name = strings.TrimPrefix(name, prefix)
			if strings.HasPrefix(prefix, "resource") {
				context = telemetrytypes.FieldContextResource
			} else {
				context = telemetrytypes.FieldContextAttribute
			}
			break
		}
	}
	// A resource attribute with the same name as an intrinsic column is not
	// that intrinsic field. Only service.name is materialized from the resource.
	if column, ok := StaticFields(signal)[name]; ok && (context == telemetrytypes.FieldContextUnspecified || context == telemetrytypes.FieldContextSpan || (context == telemetrytypes.FieldContextResource && name == "service.name")) {
		return "`" + column + "`", nil
	}
	column := "attributes"
	if context == telemetrytypes.FieldContextResource {
		column = "resource_attributes"
	}
	if strings.HasPrefix(name, "body.") && signal == telemetrytypes.SignalLogs {
		column = "body_json"
		name = strings.TrimPrefix(name, "body.")
	}
	extract := fmt.Sprintf("JSON_EXTRACT(`%s`, '$.\"%s\"')", column, name)
	return "CASE WHEN JSON_TYPE(" + extract + ") = 'NULL' THEN NULL ELSE JSON_UNQUOTE(" + extract + ") END", nil
}

func Numeric(expr string) string {
	// Non-numeric attributes must remain NULL rather than being converted to
	// zero by MySQL, which would change avg/min and numeric-filter semantics.
	return "CASE WHEN " + expr + " REGEXP '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)([eE][+-]?[0-9]+)?$' THEN CAST(" + expr + " AS DECIMAL(38,9)) ELSE NULL END"
}

func Alias(name string) string { return "`" + strings.ReplaceAll(name, "`", "``") + "`" }
