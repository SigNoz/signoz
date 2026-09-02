package telemetrymetadata

import (
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// boolFieldValues is the suggestion set for a bool field, optionally narrowed
// by the search text.
func boolFieldValues(searchText string) *telemetrytypes.TelemetryFieldValues {
	values := &telemetrytypes.TelemetryFieldValues{}
	needle := strings.ToLower(searchText)
	for _, v := range []bool{true, false} {
		if needle == "" || strings.Contains(strconv.FormatBool(v), needle) {
			values.BoolValues = append(values.BoolValues, v)
		}
	}
	return values
}

// isKnownBoolField is true when the caller asked for the bool data type, or
// when the name is one of the signal's static bool fields and the requested
// context does not rule that static field out.
func isKnownBoolField(selector *telemetrytypes.FieldValueSelector, staticFields ...map[string]telemetrytypes.TelemetryFieldKey) bool {
	if selector.FieldDataType == telemetrytypes.FieldDataTypeBool {
		return true
	}
	if selector.FieldDataType != telemetrytypes.FieldDataTypeUnspecified {
		return false
	}
	for _, fields := range staticFields {
		field, ok := fields[selector.Name]
		if !ok || field.FieldDataType != telemetrytypes.FieldDataTypeBool {
			continue
		}
		if selector.FieldContext == telemetrytypes.FieldContextUnspecified || selector.FieldContext == field.FieldContext {
			return true
		}
	}
	return false
}
