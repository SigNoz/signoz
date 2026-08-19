package querybuilder

import (
	"encoding/json"
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
	KeyNotFoundDocURL = "https://signoz.io/docs/userguide/search-troubleshooting/#q-im-getting-key-fieldname-not-found--why-cant-it-find-my-field"

	// Doc URLs for the has/hasAny/hasAll and hasToken "unsupported" errors.
	functionBodyJSONSearchDocURL = "https://signoz.io/docs/userguide/search-troubleshooting/#q-im-getting-function-supports-only-body-json-search--can-i-use-functions-on-other-fields"
	hasTokenFunctionDocURL       = "https://signoz.io/docs/userguide/functions-reference/#hastoken-function"
)

// ResolveLogicalFields picks which logical fields a filter term builds conditions
// for. With 0 or 1 field it returns the input unchanged and no warning. When a
// name is ambiguous (several logical fields — a family is one field and never
// ambiguous with itself) it returns a warning; a resource+attribute mix defaults
// to the resource fields (the common intent), noted in the warning.
func ResolveLogicalFields(field *telemetrytypes.TelemetryFieldKey, logicalFields []*telemetrytypes.LogicalField) ([]*telemetrytypes.LogicalField, string) {
	if len(logicalFields) <= 1 {
		return logicalFields, ""
	}

	warning := fmt.Sprintf(
		"Key `%s` is ambiguous, found %d different combinations of field context / data type: %v.",
		field.Name,
		len(logicalFields),
		logicalFields,
	)

	hasResource, hasAttribute := false, false
	for _, item := range logicalFields {
		switch item.FieldContext {
		case telemetrytypes.FieldContextResource:
			hasResource = true
		case telemetrytypes.FieldContextAttribute:
			hasAttribute = true
		}
	}

	// when there is both resource and attribute context, default to resource only
	if hasResource && hasAttribute {
		filtered := make([]*telemetrytypes.LogicalField, 0, len(logicalFields))
		for _, item := range logicalFields {
			if item.FieldContext == telemetrytypes.FieldContextResource {
				filtered = append(filtered, item)
			}
		}
		logicalFields = filtered
		warning += " " + "Using `resource` context by default. To query attributes explicitly, " +
			fmt.Sprintf("use the fully qualified name (e.g., 'attribute.%s')", field.Name)
	}

	return logicalFields, warning
}

// WrapAsLogicalFields wraps physical keys (candidate or synthesized) as
// single-member logical fields addressed by the requested spelling.
func WrapAsLogicalFields(requestedName string, keys []*telemetrytypes.TelemetryFieldKey) []*telemetrytypes.LogicalField {
	fields := make([]*telemetrytypes.LogicalField, 0, len(keys))
	for _, key := range keys {
		fields = append(fields, telemetrytypes.SingleLogicalField(requestedName, key))
	}
	return fields
}

// SingleKeys flattens logical fields to their single members. It is the
// adapter for signals whose fields are single-member by construction (every
// signal without family support); their condition builders keep compiling per
// physical key.
func SingleKeys(fields []*telemetrytypes.LogicalField) []*telemetrytypes.TelemetryFieldKey {
	keys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(fields))
	for _, field := range fields {
		keys = append(keys, field.Single())
	}
	return keys
}

// NewKeyNotFoundError builds the error a condition builder returns when a filter term
// references a key it has no matching field key for.
func NewKeyNotFoundError(name string) error {
	return errors.NewInvalidInputf(errors.CodeInvalidInput, "key `%s` not found", name).WithUrl(KeyNotFoundDocURL)
}

// NewKeyNotFoundWarning is the warning surfaced when a referenced key is absent from
// metadata and the query falls back to synthesized keys.
func NewKeyNotFoundWarning(name string) string {
	return fmt.Sprintf("key `%s` not found in metadata; querying the underlying data directly. If this is unexpected, check the key name for typos.", name)
}

// SynthesizeKeys builds the field keys to query when metadata has no match: a qualified
// key is honored as-is; a bare key defaults to attribute context with the data type
// inferred from the operand, or fanned out across string/number/bool without one.
func SynthesizeKeys(field *telemetrytypes.TelemetryFieldKey, value any) []*telemetrytypes.TelemetryFieldKey {
	fieldContext := field.FieldContext
	if fieldContext == telemetrytypes.FieldContextUnspecified {
		fieldContext = telemetrytypes.FieldContextAttribute
	}
	fieldDataType := field.FieldDataType
	// Resource values are strings; pin the type so operand coercion applies.
	if fieldContext == telemetrytypes.FieldContextResource &&
		fieldDataType == telemetrytypes.FieldDataTypeUnspecified {
		fieldDataType = telemetrytypes.FieldDataTypeString
	}

	// A set data type needs only one synthesized key.
	if fieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		return []*telemetrytypes.TelemetryFieldKey{telemetrytypes.NewTelemetryFieldKey(field.Name, fieldContext, fieldDataType)}
	}

	dataTypes := inferDataTypesFromOperand(value)
	keys := make([]*telemetrytypes.TelemetryFieldKey, 0, len(dataTypes))
	for _, dt := range dataTypes {
		keys = append(keys, telemetrytypes.NewTelemetryFieldKey(field.Name, fieldContext, dt))
	}
	return keys
}

// allVariantDataTypes is the fanout used when no operand pins the type (exists / group by).
func allVariantDataTypes() []telemetrytypes.FieldDataType {
	return []telemetrytypes.FieldDataType{
		telemetrytypes.FieldDataTypeString,
		telemetrytypes.FieldDataTypeNumber,
		telemetrytypes.FieldDataTypeBool,
	}
}

// inferDataTypesFromOperand maps an operand value to the data type(s) to query. With no
// operand or an unrecognized type it fans out across all variants.
func inferDataTypesFromOperand(value any) []telemetrytypes.FieldDataType {
	switch v := value.(type) {
	case nil:
		return allVariantDataTypes()
	case string:
		return []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeString}
	case bool:
		return []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeBool}
	case float32, float64, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, json.Number:
		return []telemetrytypes.FieldDataType{telemetrytypes.FieldDataTypeNumber}
	case []any:
		return inferDataTypesFromList(v)
	default:
		return allVariantDataTypes()
	}
}

// inferDataTypesFromList derives the distinct data types present in an `in` list, kept
// in string/number/bool order; an empty or all-unknown list fans out.
func inferDataTypesFromList(values []any) []telemetrytypes.FieldDataType {
	var hasString, hasNumber, hasBool bool
	for _, v := range values {
		switch v.(type) {
		case string:
			hasString = true
		case bool:
			hasBool = true
		case float32, float64, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, json.Number:
			hasNumber = true
		}
	}
	var out []telemetrytypes.FieldDataType
	if hasString {
		out = append(out, telemetrytypes.FieldDataTypeString)
	}
	if hasNumber {
		out = append(out, telemetrytypes.FieldDataTypeNumber)
	}
	if hasBool {
		out = append(out, telemetrytypes.FieldDataTypeBool)
	}
	if len(out) == 0 {
		return allVariantDataTypes()
	}
	return out
}

// NewFunctionUnsupportedError returns the error for a has/hasAny/hasAll/hasToken/search
// operator on a builder that doesn't support it (logs only), or nil for other operators.
func NewFunctionUnsupportedError(operator qbtypes.FilterOperator) error {
	switch operator {
	case qbtypes.FilterOperatorHasToken:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "function `hasToken` only supports body field as first parameter").WithUrl(hasTokenFunctionDocURL)
	case qbtypes.FilterOperatorHas, qbtypes.FilterOperatorHasAny, qbtypes.FilterOperatorHasAll:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "function `%s` supports only body JSON search", operator.FunctionName()).WithUrl(functionBodyJSONSearchDocURL)
	case qbtypes.FilterOperatorSearch:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "function `search` is only supported for logs")
	default:
		return nil
	}
}
