package querier

import (
	"fmt"
	"reflect"
	"strings"
)

func getPointerValue(v any) any {

	// Check if the interface value is nil
	if v == nil {
		return nil
	}

	// Use reflection to check if the pointer is nil
	rv := reflect.ValueOf(v)
	if rv.Kind() == reflect.Pointer && rv.IsNil() {
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

// formatValueForProm formats the value to be used in promql.
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
