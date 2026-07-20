package telemetrytypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

const wildcardSelector = "*"

var telemetryGrantQueryTypes = map[string]struct{}{
	"builder_query":     {},
	"builder_sub_query": {},
	"promql":            {},
	"clickhouse_sql":    {},
}

var telemetryGrantKeys = map[string]struct{}{
	"service.name": {},
}

// NewTelemetryGrantKey folds a key spelling to its canonical grant key and
// reports whether it is an allowed telemetry grant key. resource-context and
// unspecified spellings of service.name both fold to "service.name".
func NewTelemetryGrantKey(keyText string) (string, bool) {
	fieldKey := GetFieldKeyFromKeyText(keyText)
	if fieldKey.FieldContext != FieldContextUnspecified && fieldKey.FieldContext != FieldContextResource {
		return "", false
	}

	if _, ok := telemetryGrantKeys[fieldKey.Name]; !ok {
		return "", false
	}

	return fieldKey.Name, true
}

func NewTelemetryGrantSelector(input string) (string, error) {
	if input == wildcardSelector {
		return input, nil
	}

	parts := strings.SplitN(input, "/", 3)

	if _, ok := telemetryGrantQueryTypes[parts[0]]; !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "telemetry selector %q must start with a supported query type or be %q", input, wildcardSelector)
	}
	queryType := parts[0]

	if len(parts) < 3 {
		if len(parts) == 2 && parts[1] != wildcardSelector {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "telemetry selector %q must be <query_type>, <query_type>/*, <query_type>/<key>/* or <query_type>/<key>/<value>", input)
		}
		return queryType + "/" + wildcardSelector, nil
	}

	key, ok := NewTelemetryGrantKey(parts[1])
	if !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "telemetry selector %q must use a supported key: %s", input, strings.Join(telemetryGrantKeyNames(), ", "))
	}

	value := parts[2]
	if value == wildcardSelector {
		return queryType + "/" + key + "/" + wildcardSelector, nil
	}
	if value == "" || strings.HasPrefix(value, "$") {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "telemetry selector %q must use a concrete non-empty value", input)
	}

	return queryType + "/" + key + "/" + value, nil
}

func telemetryGrantKeyNames() []string {
	names := make([]string, 0, len(telemetryGrantKeys))
	for name := range telemetryGrantKeys {
		names = append(names, name)
	}
	return names
}
