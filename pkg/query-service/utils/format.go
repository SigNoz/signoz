package utils

import (
	"fmt"
	"reflect"
	"strings"

	"go.uber.org/zap"
)

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
