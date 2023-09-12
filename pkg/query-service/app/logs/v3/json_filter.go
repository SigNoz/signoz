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
	ARRAY_STRING  = "Array(String)"
	ARRAY_INT64   = "Array(Int64)"
	ARRAY_FLOAT64 = "Array(Float64)"
)

var dataTypeMapping = map[string]string{
	"string":         STRING,
	"int64":          INT64,
	"float64":        FLOAT64,
	"array(string)":  ARRAY_STRING,
	"array(int64)":   ARRAY_INT64,
	"array(float64)": ARRAY_FLOAT64,
}

var arrayValueTypeMapping = map[string]string{
	"array(string)":  "string",
	"array(int64)":   "int64",
	"array(float64)": "float64",
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
}

func getJSONFilterKey(key v3.AttributeKey) (string, error) {
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

	if dataType == "String" {
		return fmt.Sprintf("JSON_VALUE(%s, '$.%s')", keyArr[0], strings.Join(keyArr[1:], ".")), nil
	}

	return fmt.Sprintf("JSONExtract(JSON_QUERY(%s, '$.%s'), '%s')", keyArr[0], strings.Join(keyArr[1:], "."), dataType), nil

}

func GetJSONFilter(item v3.FilterItem) (string, error) {
	key, err := getJSONFilterKey(item.Key)
	if err != nil {
		return "", err
	}

	// check if its an array and handle it
	if dataType, ok := arrayValueTypeMapping[string(item.Key.DataType)]; ok {
		if item.Operator != "has" {
			return "", fmt.Errorf("only has operator is supported for array")
		}
		value, err := utils.ValidateAndCastValue(item.Value, v3.AttributeKeyDataType(dataType))
		if err != nil {
			return "", fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
		}
		fmtVal := utils.ClickHouseFormattedValue(value)
		filter := fmt.Sprintf("has(%s, %s)", key, fmtVal)
		return filter, nil
	}

	// non array
	value, err := utils.ValidateAndCastValue(item.Value, item.Key.DataType)
	if err != nil {
		return "", fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
	}

	op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
	if logsOp, ok := jsonLogOperators[op]; ok {
		switch op {
		case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex:
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
