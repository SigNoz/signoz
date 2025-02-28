package utils

import (
	"fmt"
	"math"
	"reflect"
	"strconv"
	"strings"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/metrics"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

// ValidateAndCastValue validates and casts the value of a key to the corresponding data type of the key
func ValidateAndCastValue(v interface{}, dataType v3.AttributeKeyDataType) (interface{}, error) {
	// get the actual value if it's a pointer
	v = getPointerValue(v)
	switch dataType {
	case v3.AttributeKeyDataTypeString:
		switch x := v.(type) {
		case string, int, int64, float32, float64, bool:
			return fmt.Sprintf("%v", x), nil
		case []interface{}:
			for i, val := range x {
				// if val is not string and it is int, int64, float, bool, convert it to string
				if _, ok := val.(string); ok {
					continue
				} else if _, ok := val.(int); ok {
					x[i] = fmt.Sprintf("%v", val)
				} else if _, ok := val.(int64); ok {
					x[i] = fmt.Sprintf("%v", val)
				} else if _, ok := val.(float32); ok {
					x[i] = fmt.Sprintf("%v", val)
				} else if _, ok := val.(float64); ok {
					x[i] = fmt.Sprintf("%v", val)
				} else if _, ok := val.(bool); ok {
					x[i] = fmt.Sprintf("%v", val)
				} else {
					return nil, fmt.Errorf("invalid data type, expected string, got %v", reflect.TypeOf(val))
				}
			}
			return x, nil
		case []string:
			return x, nil
		default:
			return nil, fmt.Errorf("invalid data type, expected string, got %v", reflect.TypeOf(v))
		}
	case v3.AttributeKeyDataTypeBool:
		switch x := v.(type) {
		case []interface{}:
			for i, val := range x {
				if _, ok := val.(string); ok {
					boolean, err := strconv.ParseBool(val.(string))
					if err != nil {
						return nil, fmt.Errorf("invalid data type, expected bool, got %v", reflect.TypeOf(val))
					}
					x[i] = boolean
				} else if _, ok := val.(bool); !ok {
					return nil, fmt.Errorf("invalid data type, expected bool, got %v", reflect.TypeOf(val))
				} else {
					x[i] = val.(bool)
				}
			}
			return x, nil
		case bool:
			return x, nil
		case string:
			boolean, err := strconv.ParseBool(x)
			if err != nil {
				return nil, fmt.Errorf("invalid data type, expected bool, got %v", reflect.TypeOf(v))
			}
			return boolean, nil
		default:
			return nil, fmt.Errorf("invalid data type, expected bool, got %v", reflect.TypeOf(v))
		}
	case v3.AttributeKeyDataTypeInt64:
		switch x := v.(type) {
		case []interface{}:
			for i, val := range x {
				if _, ok := val.(string); ok {
					int64val, err := strconv.ParseInt(val.(string), 10, 64)
					if err != nil {
						return nil, fmt.Errorf("invalid data type, expected int, got %v", reflect.TypeOf(val))
					}
					x[i] = int64val
				} else if _, ok := val.(int); ok {
					x[i] = int64(val.(int))
				} else if _, ok := val.(int64); !ok {
					return nil, fmt.Errorf("invalid data type, expected int, got %v", reflect.TypeOf(val))
				} else {
					x[i] = val.(int64)
				}
			}
			return x, nil
		case int, int64:
			return x, nil
		case float32:
			return int64(x), nil
		case float64:
			return int64(x), nil
		case string:
			int64val, err := strconv.ParseInt(x, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid data type, expected int, got %v", reflect.TypeOf(v))
			}
			return int64val, nil
		default:
			return nil, fmt.Errorf("invalid data type, expected int, got %v", reflect.TypeOf(v))
		}
	case v3.AttributeKeyDataTypeFloat64:
		switch x := v.(type) {
		case []interface{}:
			for i, val := range x {
				if _, ok := val.(string); ok {
					float64val, err := strconv.ParseFloat(val.(string), 64)
					if err != nil {
						return nil, fmt.Errorf("invalid data type, expected float, got %v", reflect.TypeOf(val))
					}
					x[i] = float64val
				} else if _, ok := val.(float32); ok {
					x[i] = float64(val.(float32))
				} else if _, ok := val.(int); ok {
					x[i] = float64(val.(int))
				} else if _, ok := val.(int64); ok {
					x[i] = float64(val.(int64))
				} else if _, ok := val.(float64); !ok {
					return nil, fmt.Errorf("invalid data type, expected float, got %v", reflect.TypeOf(val))
				} else {
					x[i] = val.(float64)
				}
			}
			return x, nil
		case float32, float64:
			return x, nil
		case string:
			float64val, err := strconv.ParseFloat(x, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid data type, expected float, got %v", reflect.TypeOf(v))
			}
			return float64val, nil
		case int:
			return float64(x), nil
		case int64:
			return float64(x), nil
		default:
			return nil, fmt.Errorf("invalid data type, expected float, got %v", reflect.TypeOf(v))
		}
	default:
		return nil, fmt.Errorf("invalid data type, expected float, bool, int, string or []interface{} but got %v", dataType)
	}
}

func QuoteEscapedString(str string) string {
	// https://clickhouse.com/docs/en/sql-reference/syntax#string
	str = strings.ReplaceAll(str, `\`, `\\`)
	str = strings.ReplaceAll(str, `'`, `\'`)
	return str
}

func QuoteEscapedStringForContains(str string, isIndex bool) string {
	// https: //clickhouse.com/docs/en/sql-reference/functions/string-search-functions#like
	str = QuoteEscapedString(str)

	// we are adding this because if a string contains quote `"` it will be stored as \" in clickhouse
	// to query that using like our query should be \\\\"
	if isIndex {
		// isIndex is true means that the extra slash is present
		// [\"a\",\"b\",\"sdf\"]
		str = strings.ReplaceAll(str, `"`, `\\\\"`)
	}

	str = strings.ReplaceAll(str, `%`, `\%`)
	str = strings.ReplaceAll(str, `_`, `\_`)
	return str
}

// ClickHouseFormattedValue formats the value to be used in clickhouse query
func ClickHouseFormattedValue(v interface{}) string {
	// if it's pointer convert it to a value
	v = getPointerValue(v)

	switch x := v.(type) {
	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return fmt.Sprintf("'%s'", QuoteEscapedString(x))
	case bool:
		return fmt.Sprintf("%v", x)

	case []interface{}:
		if len(x) == 0 {
			return "[]"
		}
		switch x[0].(type) {
		case string:
			str := "["
			for idx, sVal := range x {
				str += fmt.Sprintf("'%s'", QuoteEscapedString(sVal.(string)))
				if idx != len(x)-1 {
					str += ","
				}
			}
			str += "]"
			return str
		case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64, float32, float64, bool:
			return strings.Join(strings.Fields(fmt.Sprint(x)), ",")
		default:
			zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x[0])))
			return "[]"
		}
	case []string:
		if len(x) == 0 {
			return "[]"
		}
		str := "["
		for idx, sVal := range x {
			str += fmt.Sprintf("'%s'", QuoteEscapedString(sVal))
			if idx != len(x)-1 {
				str += ","
			}
		}
		str += "]"
		return str
	default:
		zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x)))
		return ""
	}
}

func ClickHouseFormattedMetricNames(v interface{}) string {
	if name, ok := v.(string); ok {
		if newName, ok := metrics.MetricsUnderTransition[name]; ok {
			return ClickHouseFormattedValue([]interface{}{name, newName})
		} else {
			return ClickHouseFormattedValue([]interface{}{name})
		}
	}

	return ClickHouseFormattedValue(v)
}

func AddBackTickToFormatTag(str string) string {
	if strings.Contains(str, ".") {
		return "`" + str + "`"
	} else {
		return str
	}
}

func AddBackTickToFormatTags(inputs ...string) []string {
	result := make([]string, len(inputs))
	for i, str := range inputs {
		result[i] = AddBackTickToFormatTag(str)
	}
	return result
}

func getPointerValue(v interface{}) interface{} {
	switch x := v.(type) {
	case *uint8:
		return *x
	case *uint16:
		return *x
	case *uint32:
		return *x
	case *uint64:
		return *x
	case *int:
		return *x
	case *int8:
		return *x
	case *int16:
		return *x
	case *int32:
		return *x
	case *int64:
		return *x
	case *float32:
		return *x
	case *float64:
		return *x
	case *string:
		return *x
	case *bool:
		return *x
	case []interface{}:
		values := []interface{}{}
		for _, val := range x {
			values = append(values, getPointerValue(val))
		}
		return values
	default:
		return v
	}
}

func GetClickhouseColumnName(typeName string, dataType, field string) string {
	if typeName == string(v3.AttributeKeyTypeTag) {
		typeName = constants.Attributes
	}

	if typeName != string(v3.AttributeKeyTypeResource) {
		typeName = typeName[:len(typeName)-1]
	}

	// if name contains . replace it with `$$`
	field = strings.ReplaceAll(field, ".", "$$")

	colName := fmt.Sprintf("`%s_%s_%s`", strings.ToLower(typeName), strings.ToLower(dataType), field)
	return colName
}

func GetClickhouseColumnNameV2(typeName string, dataType, field string) string {
	if typeName == string(v3.AttributeKeyTypeTag) {
		typeName = constants.Attributes
	}

	if typeName != string(v3.AttributeKeyTypeResource) {
		typeName = typeName[:len(typeName)-1]
	}

	dataType = strings.ToLower(dataType)

	if dataType == "int64" || dataType == "float64" {
		dataType = "number"
	}

	// if name contains . replace it with `$$`
	field = strings.ReplaceAll(field, ".", "$$")

	colName := fmt.Sprintf("%s_%s_%s", strings.ToLower(typeName), dataType, field)
	return colName
}

// GetEpochNanoSecs takes epoch and returns it in ns
func GetEpochNanoSecs(epoch int64) int64 {
	temp := epoch
	count := 0
	if epoch == 0 {
		count = 1
	} else {
		for epoch != 0 {
			epoch /= 10
			count++
		}
	}
	return temp * int64(math.Pow(10, float64(19-count)))
}
