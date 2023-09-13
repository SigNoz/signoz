package v3

import (
	"fmt"
	"strings"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

const (
	STRING        = "String"
	INT64         = "Int64"
	FLOAT64       = "Float64"
	BOOL          = "Bool"
	ARRAY_STRING  = "Array(String)"
	ARRAY_INT64   = "Array(Int64)"
	ARRAY_FLOAT64 = "Array(Float64)"
	ARRAY_BOOL    = "Array(Bool)"
)

var dataTypeMapping = map[string]string{
	"string":         STRING,
	"int64":          INT64,
	"float64":        FLOAT64,
	"bool":           BOOL,
	"array(string)":  ARRAY_STRING,
	"array(int64)":   ARRAY_INT64,
	"array(float64)": ARRAY_FLOAT64,
	"array(bool)":    ARRAY_BOOL,
}

var arrayValueTypeMapping = map[string]string{
	"array(string)":  "string",
	"array(int64)":   "int64",
	"array(float64)": "float64",
	"array(bool)":    "bool",
}

var jsonLogOperators = map[v3.FilterOperator]string{
	v3.FilterOperatorEqual:           "=",
	v3.FilterOperatorNotEqual:        "!=",
	v3.FilterOperatorLessThan:        "<",
	v3.FilterOperatorLessThanOrEq:    "<=",
	v3.FilterOperatorGreaterThan:     ">",
	v3.FilterOperatorGreaterThanOrEq: ">=",
	v3.FilterOperatorLike:            "ILIKE",
	v3.FilterOperatorNotLike:         "NOT ILIKE",
	v3.FilterOperatorContains:        "ILIKE",
	v3.FilterOperatorNotContains:     "NOT ILIKE",
	v3.FilterOperatorRegex:           "match(%s, %s)",
	v3.FilterOperatorNotRegex:        "NOT match(%s, %s)",
	v3.FilterOperatorIn:              "IN",
	v3.FilterOperatorNotIn:           "NOT IN",
	v3.FilterOperatorHas:             "has(%s, %s)",
	v3.FilterOperatorNotHas:          "NOT has(%s, %s)",
}

func getJSONFilterKey(key v3.AttributeKey, isArray bool) (string, error) {
	keyArr := strings.Split(key.Key, ".")
	if len(keyArr) < 2 {
		return "", fmt.Errorf("incorrect key, should contain at least 2 parts")
	}

	// only body is supported as of now
	if strings.Compare(keyArr[0], "body") != 0 {
		return "", fmt.Errorf("only body can be the root key")
	}

	var dataType string
	var ok bool
	if dataType, ok = dataTypeMapping[string(key.DataType)]; !ok {
		return "", fmt.Errorf("unsupported dataType for JSON: %s", key.DataType)
	}

	if isArray {
		return fmt.Sprintf("JSONExtract(JSON_QUERY(%s, '$.%s'), '%s')", keyArr[0], strings.Join(keyArr[1:], "."), dataType), nil
	}

	// for non array
	keyname := fmt.Sprintf("JSON_VALUE(%s, '$.%s')", keyArr[0], strings.Join(keyArr[1:], "."))
	if dataType != STRING {
		keyname = fmt.Sprintf("JSONExtract(%s, '%s')", keyname, dataType)
	}

	return keyname, nil
}

func GetJSONFilter(item v3.FilterItem) (string, error) {

	dataType := item.Key.DataType
	isArray := false
	// check if its an array and handle it
	if val, ok := arrayValueTypeMapping[string(item.Key.DataType)]; ok {
		if item.Operator != v3.FilterOperatorHas && item.Operator != v3.FilterOperatorNotHas {
			return "", fmt.Errorf("only has operator is supported for array")
		}
		isArray = true
		dataType = v3.AttributeKeyDataType(val)
	}

	key, err := getJSONFilterKey(item.Key, isArray)
	if err != nil {
		return "", err
	}

	// non array
	value, err := utils.ValidateAndCastValue(item.Value, dataType)
	if err != nil {
		return "", fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
	}

	op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
	if logsOp, ok := jsonLogOperators[op]; ok {
		switch op {
		case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex, v3.FilterOperatorHas, v3.FilterOperatorNotHas:
			fmtVal := utils.ClickHouseFormattedValue(value)
			return fmt.Sprintf(logsOp, key, fmtVal), nil
		case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
			return fmt.Sprintf("%s %s '%%%s%%'", key, logsOp, item.Value), nil
		default:
			fmtVal := utils.ClickHouseFormattedValue(value)
			return fmt.Sprintf("%s %s %s", key, logsOp, fmtVal), nil
		}
	}
	return "", fmt.Errorf("unsupported operator: %s", op)
}
