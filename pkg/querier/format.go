package querier

import (
	"fmt"
	"reflect"
	"strings"
)

func toStrArrayString(strs ...string) string {
	return fmt.Sprintf("[%s]", strings.Join(strs, ","))
}

// formatValue formats the value to be used in clickhouse query
func formatValueForCH(v any) string {
	// if it's pointer convert it to a value
	v = getPointerValue(v)

	switch x := v.(type) {
	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return fmt.Sprintf("'%s'", quoteEscapedString(x))
	case bool:
		return fmt.Sprintf("%v", x)

	case []any:
		if len(x) == 0 {
			return "[]"
		}
		switch x[0].(type) {
		case string:
			strs := []string{}
			for _, sVal := range x {
				strs = append(strs, fmt.Sprintf("'%s'", quoteEscapedString(sVal.(string))))
			}
			return toStrArrayString(strs...)
		case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64, float32, float64, bool:
			return strings.Join(strings.Fields(fmt.Sprint(x)), ",")
		default:
			return toStrArrayString()
		}
	case []string:
		strs := []string{}
		for _, sVal := range x {
			strs = append(strs, fmt.Sprintf("'%s'", quoteEscapedString(sVal)))
		}
		return toStrArrayString(strs...)
	default:
		return ""
	}
}

func getPointerValue(v any) any {

	// Check if the interface value is nil
	if v == nil {
		return nil
	}

	// Use reflection to check if the pointer is nil
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Ptr && rv.IsNil() {
		return nil
	}

	switch x := v.(type) {
	case *uint8:
		if x == nil {
			return nil
		}
		return *x
	case *uint16:
		if x == nil {
			return nil
		}
		return *x
	case *uint32:
		if x == nil {
			return nil
		}
		return *x
	case *uint64:
		if x == nil {
			return nil
		}
		return *x
	case *int:
		if x == nil {
			return nil
		}
		return *x
	case *int8:
		if x == nil {
			return nil
		}
		return *x
	case *int16:
		if x == nil {
			return nil
		}
		return *x
	case *int32:
		if x == nil {
			return nil
		}
		return *x
	case *int64:
		if x == nil {
			return nil
		}
		return *x
	case *float32:
		if x == nil {
			return nil
		}
		return *x
	case *float64:
		if x == nil {
			return nil
		}
		return *x
	case *string:
		if x == nil {
			return nil
		}
		return *x
	case *bool:
		if x == nil {
			return nil
		}
		return *x
	case []any:
		values := []any{}
		for _, val := range x {
			values = append(values, getPointerValue(val))
		}
		return values
	default:
		return v
	}
}

func quoteEscapedString(str string) string {
	// https://clickhouse.com/docs/en/sql-reference/syntax#string
	str = strings.ReplaceAll(str, `\`, `\\`)
	str = strings.ReplaceAll(str, `'`, `\'`)
	return str
}

// formatValueForProm formats the value to be used in promql
func formatValueForProm(v any) string {
	switch x := v.(type) {
	case int:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return x
	case bool:
		return fmt.Sprintf("%v", x)
	case []interface{}:
		if len(x) == 0 {
			return ""
		}
		switch x[0].(type) {
		case string, int, float32, float64, bool:
			// list of values joined by | for promql - a value can contain whitespace
			var str []string
			for _, sVal := range x {
				str = append(str, fmt.Sprintf("%v", sVal))
			}
			return strings.Join(str, "|")
		default:
			return ""
		}
	default:
		return ""
	}
}
