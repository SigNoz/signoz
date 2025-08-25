package telemetrylogs

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
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

func inferDataType(value any, operator qbtypes.FilterOperator, key *telemetrytypes.TelemetryFieldKey) (telemetrytypes.FieldDataType, any) {
	// check if the value is a int, float, string, bool
	valueType := telemetrytypes.FieldDataTypeUnspecified
	switch v := value.(type) {
	case []any:
		// take the first element and infer the type
		if len(v) > 0 {
			valueType, _ = inferDataType(v[0], operator, key)
		}
		return valueType, v
	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
		valueType = telemetrytypes.FieldDataTypeInt64
	case float32, float64:
		valueType = telemetrytypes.FieldDataTypeFloat64
	case string:
		valueType, value = parseStrValue(v, operator)
	case bool:
		valueType = telemetrytypes.FieldDataTypeBool
	}

	// check if it is array
	if strings.HasSuffix(key.Name, "[*]") || strings.HasSuffix(key.Name, "[]") {
		valueType = telemetrytypes.FieldDataType{String: valuer.NewString(fmt.Sprintf("[]%s", valueType.StringValue()))}
	}

	return valueType, value
}

func getBodyJSONPath(key *telemetrytypes.TelemetryFieldKey) string {
	parts := strings.Split(key.Name, ".")[1:]
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

	dataType, value := inferDataType(value, operator, key)

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
