package querybuilder

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	// FieldContextDataTypesDocURL documents how to disambiguate a key that resolves
	// to multiple field context / data type combinations.
	FieldContextDataTypesDocURL = "https://signoz.io/docs/userguide/field-context-data-types/"
	// KeyNotFoundDocURL documents the "key not found" error.
	KeyNotFoundDocURL = "https://signoz.io/docs/userguide/search-troubleshooting/#key-fieldname-not-found"

	// Doc URLs for the has/hasAny/hasAll and hasToken "unsupported" errors.
	functionBodyJSONSearchDocURL = "https://signoz.io/docs/userguide/search-troubleshooting/#function-supports-only-body-json-search"
	hasTokenFunctionDocURL       = "https://signoz.io/docs/userguide/functions-reference/#hastoken-function"
)

// ResolveKeys picks which matching field keys a filter term builds conditions for.
// With 0 or 1 match it returns the input unchanged and no warning. When a name is
// ambiguous it returns a warning; a resource+attribute mix defaults to the resource
// keys (the common intent), noted in the warning.
func ResolveKeys(field *telemetrytypes.TelemetryFieldKey, fieldKeysForName []*telemetrytypes.TelemetryFieldKey) ([]*telemetrytypes.TelemetryFieldKey, string) {
	if len(fieldKeysForName) <= 1 {
		return fieldKeysForName, ""
	}

	warning := fmt.Sprintf(
		"Key `%s` is ambiguous, found %d different combinations of field context / data type: %v.",
		field.Name,
		len(fieldKeysForName),
		fieldKeysForName,
	)

	hasResource, hasAttribute := false, false
	for _, item := range fieldKeysForName {
		switch item.FieldContext {
		case telemetrytypes.FieldContextResource:
			hasResource = true
		case telemetrytypes.FieldContextAttribute:
			hasAttribute = true
		}
	}

	// when there is both resource and attribute context, default to resource only
	if hasResource && hasAttribute {
		filteredKeys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(fieldKeysForName))
		for _, item := range fieldKeysForName {
			if item.FieldContext == telemetrytypes.FieldContextResource {
				filteredKeys = append(filteredKeys, item)
			}
		}
		fieldKeysForName = filteredKeys
		warning += " " + "Using `resource` context by default. To query attributes explicitly, " +
			fmt.Sprintf("use the fully qualified name (e.g., 'attribute.%s')", field.Name)
	}

	return fieldKeysForName, warning
}

// NewKeyNotFoundError builds the error a condition builder returns when a filter term
// references a key it has no matching field key for.
func NewKeyNotFoundError(name string) error {
	return errors.NewInvalidInputf(errors.CodeInvalidInput, "key `%s` not found", name).WithUrl(KeyNotFoundDocURL)
}

// NewFunctionUnsupportedError returns the error for a has/hasAny/hasAll/hasToken operator
// on a builder that doesn't support it (logs body only), or nil for other operators.
func NewFunctionUnsupportedError(operator qbtypes.FilterOperator) error {
	switch operator {
	case qbtypes.FilterOperatorHasToken:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "function `hasToken` only supports body field as first parameter").WithUrl(hasTokenFunctionDocURL)
	case qbtypes.FilterOperatorHas, qbtypes.FilterOperatorHasAny, qbtypes.FilterOperatorHasAll:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "function `%s` supports only body JSON search", operator.FunctionName()).WithUrl(functionBodyJSONSearchDocURL)
	default:
		return nil
	}
}
