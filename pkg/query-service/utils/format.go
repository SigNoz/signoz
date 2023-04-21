package utils

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

func ValidateAndCastValue(v interface{}, dataType v3.AttributeKeyDataType) (interface{}, error) {
	switch dataType {
	case v3.AttributeKeyDataTypeString:
		switch x := v.(type) {
		case string, int, float32, float64, bool:
			return fmt.Sprintf("%v", x), nil
		case []interface{}:
			return v, nil
		default:
			return nil, fmt.Errorf("invalid data type")
		}
	case v3.AttributeKeyDataTypeBool:
		switch x := v.(type) {
		case bool:
			return v, nil
		case string:
			return strconv.ParseBool(x)
		default:
			return nil, fmt.Errorf("invalid data type")
		}
	case v3.AttributeKeyDataTypeInt64:
		switch x := v.(type) {
		case int, int64:
			return x, nil
		case string:
			return strconv.ParseInt(x, 10, 64)
		default:
			return nil, fmt.Errorf("invalid data type")
		}
	case v3.AttributeKeyDataTypeFloat64:
		switch x := v.(type) {
		case float32, float64:
			return v, nil
		case string:
			return strconv.ParseFloat(x, 64)
		case int:
			return float64(x), nil
		case int64:
			return float64(x), nil
		default:
			return nil, fmt.Errorf("invalid data type")
		}
	default:
		return nil, fmt.Errorf("invalid data type")
	}
}

// ClickHouseFormattedValue formats the value to be used in clickhouse query
func ClickHouseFormattedValue(v interface{}) string {
	switch x := v.(type) {
	case int:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return fmt.Sprintf("'%s'", x)
	case bool:
		return fmt.Sprintf("%v", x)
	case []interface{}:
		if len(x) == 0 {
			return ""
		}
		switch x[0].(type) {
		case string:
			str := "["
			for idx, sVal := range x {
				str += fmt.Sprintf("'%s'", sVal)
				if idx != len(x)-1 {
					str += ","
				}
			}
			str += "]"
			return str
		case int, float32, float64, bool:
			return strings.Join(strings.Fields(fmt.Sprint(x)), ",")
		default:
			zap.S().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x[0])))
			return ""
		}
	default:
		zap.S().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x)))
		return ""
	}
}
