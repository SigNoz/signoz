package telemetrylogs

import (
	"context"
	"fmt"
	"reflect"
	"strconv"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func parseStrValue(valueStr string, operator qbtypes.FilterOperator) (telemetrytypes.FieldDataType, any) {

	valueType := telemetrytypes.FieldDataTypeString

	// return the value as is for the following operators
	// as they are always string
	if operator == qbtypes.FilterOperatorContains || operator == qbtypes.FilterOperatorNotContains ||
		operator == qbtypes.FilterOperatorRegexp || operator == qbtypes.FilterOperatorNotRegexp ||
		operator == qbtypes.FilterOperatorLike || operator == qbtypes.FilterOperatorNotLike ||
		operator == qbtypes.FilterOperatorILike || operator == qbtypes.FilterOperatorNotILike {
		return valueType, valueStr
	}

	var err error
	var parsedValue any
	if parsedValue, err = strconv.ParseInt(valueStr, 10, 64); err == nil {
		valueType = telemetrytypes.FieldDataTypeInt64
	} else if parsedValue, err = strconv.ParseFloat(valueStr, 64); err == nil {
		valueType = telemetrytypes.FieldDataTypeFloat64
	} else if parsedValue, err = strconv.ParseBool(valueStr); err == nil {
		valueType = telemetrytypes.FieldDataTypeBool
	} else {
		parsedValue = valueStr
		valueType = telemetrytypes.FieldDataTypeString
	}

	return valueType, parsedValue
}

func InferDataType(value any, operator qbtypes.FilterOperator, key *telemetrytypes.TelemetryFieldKey) (telemetrytypes.FieldDataType, any) {
	if operator.IsArrayOperator() && reflect.ValueOf(value).Kind() != reflect.Slice {
		value = []any{value}
	}

	// closure to calculate the data type of the value
	var closure func(value any, key *telemetrytypes.TelemetryFieldKey) (telemetrytypes.FieldDataType, any)
	closure = func(value any, key *telemetrytypes.TelemetryFieldKey) (telemetrytypes.FieldDataType, any) {
		// check if the value is a int, float, string, bool
		valueType := telemetrytypes.FieldDataTypeUnspecified
		switch v := value.(type) {
		case []any:
			// take the first element and infer the type
			var scalerType telemetrytypes.FieldDataType
			if len(v) > 0 {
				// Note: [[...]] Slices inside Slices are not handled yet
				if reflect.ValueOf(v[0]).Kind() == reflect.Slice {
					return telemetrytypes.FieldDataTypeUnspecified, value
				}

				scalerType, _ = closure(v[0], key)
			}

			arrayType := telemetrytypes.ScalerFieldTypeToArrayFieldType[scalerType]
			switch {
			// decide on the field data type based on the key
			case key.FieldDataType.IsArray():
				return arrayType, v
			default:
				// TODO(Piyush): backward compatibility for the old String based JSON QB queries
				if strings.HasSuffix(key.Name, telemetrytypes.ArrayAnyIndexSuffix) {
					return arrayType, v
				}
				return scalerType, v
			}
		case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
			valueType = telemetrytypes.FieldDataTypeInt64
		case float32, float64:
			valueType = telemetrytypes.FieldDataTypeFloat64
		case string:
			valueType, value = parseStrValue(v, operator)
		case bool:
			valueType = telemetrytypes.FieldDataTypeBool
		}

		return valueType, value
	}

	// calculate the data type of the value
	return closure(value, key)
}

func getBodyJSONPath(key *telemetrytypes.TelemetryFieldKey) string {
	parts := strings.Split(key.Name, ".")
	newParts := []string{}
	for _, part := range parts {
		if strings.HasSuffix(part, "[*]") {
			newParts = append(newParts, fmt.Sprintf(`"%s"[*]`, strings.TrimSuffix(part, "[*]")))
		} else if strings.HasSuffix(part, "[]") {
			newParts = append(newParts, fmt.Sprintf(`"%s"[*]`, strings.TrimSuffix(part, "[]")))
		} else {
			newParts = append(newParts, fmt.Sprintf(`"%s"`, part))
		}
	}
	return strings.Join(newParts, ".")
}

func GetBodyJSONKey(_ context.Context, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any) (string, any) {
	dataType, value := InferDataType(value, operator, key)

	// for array types, we need to extract the value from the JSON_QUERY
	if dataType == telemetrytypes.FieldDataTypeArrayInt64 ||
		dataType == telemetrytypes.FieldDataTypeArrayFloat64 ||
		dataType == telemetrytypes.FieldDataTypeArrayString ||
		dataType == telemetrytypes.FieldDataTypeArrayBool ||
		dataType == telemetrytypes.FieldDataTypeArrayNumber {
		return fmt.Sprintf("JSONExtract(JSON_QUERY(body, '$.%s'), '%s')", getBodyJSONPath(key), dataType.CHDataType()), value
	}

	if dataType != telemetrytypes.FieldDataTypeString {
		// for all types except strings, we need to extract the value from the JSON_VALUE
		return fmt.Sprintf("JSONExtract(JSON_VALUE(body, '$.%s'), '%s')", getBodyJSONPath(key), dataType.CHDataType()), value
	}
	// for string types, we should compare with the JSON_VALUE
	return fmt.Sprintf("JSON_VALUE(body, '$.%s')", getBodyJSONPath(key)), value
}

func GetBodyJSONKeyForExists(_ context.Context, key *telemetrytypes.TelemetryFieldKey, _ qbtypes.FilterOperator, _ any) string {
	return fmt.Sprintf("JSON_EXISTS(body, '$.%s')", getBodyJSONPath(key))
}
