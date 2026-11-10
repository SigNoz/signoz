package telemetrymetadata

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func staticFieldMatchesAny(field telemetrytypes.TelemetryFieldKey, selectors []*telemetrytypes.FieldKeySelector) bool {
	for _, selector := range selectors {
		if staticFieldMatches(field, selector) {
			return true
		}
	}
	return false
}

// staticFieldMatches mirrors the keys-table lookup for a static field: the
// requested context and data type, when given, must agree with the field's,
// and the name matches case-insensitively, as a substring for fuzzy selectors
// and as the whole name for exact ones.
func staticFieldMatches(field telemetrytypes.TelemetryFieldKey, selector *telemetrytypes.FieldKeySelector) bool {
	if selector.FieldContext != telemetrytypes.FieldContextUnspecified && selector.FieldContext != field.FieldContext {
		return false
	}
	if selector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified && !sameDataTypeFamily(selector.FieldDataType, field.FieldDataType) {
		return false
	}
	if selector.Name == "" {
		return true
	}
	if selector.SelectorMatchType == telemetrytypes.FieldSelectorMatchTypeExact {
		return strings.EqualFold(field.Name, selector.Name)
	}
	return strings.Contains(strings.ToLower(field.Name), strings.ToLower(selector.Name))
}

// sameDataTypeFamily treats the numeric types as one family: static fields
// declare "number" while callers may ask for int64 or float64.
func sameDataTypeFamily(requested, actual telemetrytypes.FieldDataType) bool {
	if requested == actual {
		return true
	}
	return isNumericDataType(requested) && isNumericDataType(actual)
}

func isNumericDataType(dataType telemetrytypes.FieldDataType) bool {
	switch dataType {
	case telemetrytypes.FieldDataTypeNumber, telemetrytypes.FieldDataTypeInt64, telemetrytypes.FieldDataTypeFloat64:
		return true
	}
	return false
}
