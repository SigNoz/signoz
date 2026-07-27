package telemetrytypes

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

const wildcardSelector = "*"

var telemetryGrantQueryTypes = map[string]bool{
	"builder_query":     true,
	"builder_sub_query": true,
	"promql":            false,
	"clickhouse_sql":    false,
}

var telemetryGrantKeys = map[string]struct{}{
	"signoz.workspace.key.id": {},
}

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

	keyScoped, ok := telemetryGrantQueryTypes[parts[0]]
	if !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "telemetry selector %q must start with a supported query type or be %q", input, wildcardSelector)
	}
	queryType := parts[0]

	if len(parts) < 3 {
		if len(parts) == 2 && parts[1] != wildcardSelector {
			return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "telemetry selector %q must be <query_type>, <query_type>/*, <query_type>/<key>/* or <query_type>/<key>/<value>", input)
		}
		return queryType + "/" + wildcardSelector, nil
	}

	if !keyScoped {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "telemetry selector %q is invalid: query type %q supports only %q or %q", input, queryType, queryType, queryType+"/"+wildcardSelector)
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

func NewTelemetryGrantSelectors(selector string) []string {
	if selector == wildcardSelector {
		return []string{wildcardSelector}
	}

	parts := strings.SplitN(selector, "/", 3)
	queryType := parts[0]

	if len(parts) < 3 {
		return []string{queryType + "/" + wildcardSelector, wildcardSelector}
	}

	key, value := parts[1], parts[2]
	if value == wildcardSelector {
		return []string{
			queryType + "/" + key + "/" + wildcardSelector,
			queryType + "/" + wildcardSelector,
			wildcardSelector,
		}
	}

	return []string{
		queryType + "/" + key + "/" + value,
		queryType + "/" + key + "/" + wildcardSelector,
		queryType + "/" + wildcardSelector,
		wildcardSelector,
	}
}

func telemetryGrantKeyNames() []string {
	names := make([]string, 0, len(telemetryGrantKeys))
	for name := range telemetryGrantKeys {
		names = append(names, name)
	}
	return names
}
