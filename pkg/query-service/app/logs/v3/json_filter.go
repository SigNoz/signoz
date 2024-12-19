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
	NGRAM_SIZE    = 4
)

var DataTypeMapping = map[string]string{
	"string":         STRING,
	"int64":          INT64,
	"float64":        FLOAT64,
	"bool":           BOOL,
	"array(string)":  ARRAY_STRING,
	"array(int64)":   ARRAY_INT64,
	"array(float64)": ARRAY_FLOAT64,
	"array(bool)":    ARRAY_BOOL,
}

var ArrayValueTypeMapping = map[string]string{
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
	v3.FilterOperatorExists:          "JSON_EXISTS(%s, '$.%s')",
	v3.FilterOperatorNotExists:       "NOT JSON_EXISTS(%s, '$.%s')",
	v3.FilterOperatorHas:             "has(%s, %s)",
	v3.FilterOperatorNotHas:          "NOT has(%s, %s)",
}

func GetPath(keyArr []string) string {
	path := []string{}
	for i := 0; i < len(keyArr); i++ {
		if strings.HasSuffix(keyArr[i], "[*]") {
			path = append(path, "\""+strings.TrimSuffix(keyArr[i], "[*]")+"\""+"[*]")
		} else {
			path = append(path, "\""+keyArr[i]+"\"")
		}
	}
	return strings.Join(path, ".")
}

func GetJSONFilterKey(key v3.AttributeKey, op v3.FilterOperator, isArray bool) (string, error) {
	keyArr := strings.Split(key.Key, ".")
	// i.e it should be at least body.name, and not something like body
	if len(keyArr) < 2 {
		return "", fmt.Errorf("incorrect key, should contain at least 2 parts")
	}

	// only body is supported as of now
	if strings.Compare(keyArr[0], "body") != 0 {
		return "", fmt.Errorf("only body can be the root key")
	}

	if op == v3.FilterOperatorExists || op == v3.FilterOperatorNotExists {
		return keyArr[0], nil
	}

	var dataType string
	var ok bool
	if dataType, ok = DataTypeMapping[string(key.DataType)]; !ok {
		return "", fmt.Errorf("unsupported dataType for JSON: %s", key.DataType)
	}

	path := GetPath(keyArr[1:])

	if isArray {
		return fmt.Sprintf("JSONExtract(JSON_QUERY(%s, '$.%s'), '%s')", keyArr[0], path, dataType), nil
	}

	// for non array
	keyname := fmt.Sprintf("JSON_VALUE(%s, '$.%s')", keyArr[0], path)
	if dataType != STRING {
		keyname = fmt.Sprintf("JSONExtract(%s, '%s')", keyname, dataType)
	}

	return keyname, nil
}

// takes the path and the values and generates where clauses for better usage of index
func GetPathIndexFilter(path string) string {
	filters := []string{}
	keyArr := strings.Split(path, ".")
	if len(keyArr) < 2 {
		return ""
	}

	for i, key := range keyArr {
		if i == 0 {
			continue
		}
		key = strings.TrimSuffix(key, "[*]")
		if len(key) >= NGRAM_SIZE {
			filters = append(filters, strings.ToLower(key))
		}
	}
	if len(filters) > 0 {
		return fmt.Sprintf("lower(body) like lower('%%%s%%')", strings.Join(filters, "%"))
	}
	return ""
}

func GetJSONFilter(item v3.FilterItem) (string, error) {

	dataType := item.Key.DataType
	isArray := false
	// check if its an array and handle it
	if val, ok := ArrayValueTypeMapping[string(item.Key.DataType)]; ok {
		if item.Operator != v3.FilterOperatorHas && item.Operator != v3.FilterOperatorNotHas {
			return "", fmt.Errorf("only has operator is supported for array")
		}
		isArray = true
		dataType = v3.AttributeKeyDataType(val)
	}

	key, err := GetJSONFilterKey(item.Key, item.Operator, isArray)
	if err != nil {
		return "", err
	}

	// non array
	op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))

	var value interface{}
	if op != v3.FilterOperatorExists && op != v3.FilterOperatorNotExists {
		value, err = utils.ValidateAndCastValue(item.Value, dataType)
		if err != nil {
			return "", fmt.Errorf("failed to validate and cast value for %s: %v", item.Key.Key, err)
		}
	}

	var filter string
	if logsOp, ok := jsonLogOperators[op]; ok {
		switch op {
		case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
			filter = fmt.Sprintf(logsOp, key, GetPath(strings.Split(item.Key.Key, ".")[1:]))
		case v3.FilterOperatorRegex, v3.FilterOperatorNotRegex, v3.FilterOperatorHas, v3.FilterOperatorNotHas:
			fmtVal := utils.ClickHouseFormattedValue(value)
			filter = fmt.Sprintf(logsOp, key, fmtVal)
		case v3.FilterOperatorContains, v3.FilterOperatorNotContains:
			val := utils.QuoteEscapedString(fmt.Sprintf("%v", item.Value))
			filter = fmt.Sprintf("%s %s '%%%s%%'", key, logsOp, val)
		default:
			fmtVal := utils.ClickHouseFormattedValue(value)
			filter = fmt.Sprintf("%s %s %s", key, logsOp, fmtVal)
		}
	} else {
		return "", fmt.Errorf("unsupported operator: %s", op)
	}

	filters := []string{}

	pathFilter := GetPathIndexFilter(item.Key.Key)
	if pathFilter != "" {
		filters = append(filters, pathFilter)
	}
	if op == v3.FilterOperatorContains ||
		op == v3.FilterOperatorEqual ||
		op == v3.FilterOperatorHas {
		val, ok := item.Value.(string)
		if ok && len(val) >= NGRAM_SIZE {
			filters = append(filters, fmt.Sprintf("lower(body) like lower('%%%s%%')", utils.QuoteEscapedString(strings.ToLower(val))))
		}
	}

	// add exists check for non array items as default values of int/float/bool will corrupt the results
	if !isArray && !(item.Operator == v3.FilterOperatorExists || item.Operator == v3.FilterOperatorNotExists) {
		existsFilter := fmt.Sprintf("JSON_EXISTS(body, '$.%s')", GetPath(strings.Split(item.Key.Key, ".")[1:]))
		filter = fmt.Sprintf("%s AND %s", existsFilter, filter)
	}

	filters = append(filters, filter)

	return strings.Join(filters, " AND "), nil
}
