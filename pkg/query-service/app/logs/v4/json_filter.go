package v4

import (
	"fmt"
	"strings"

	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

var jsonLogOperators = map[v3.FilterOperator]string{
	v3.FilterOperatorEqual:           "=",
	v3.FilterOperatorNotEqual:        "!=",
	v3.FilterOperatorLessThan:        "<",
	v3.FilterOperatorLessThanOrEq:    "<=",
	v3.FilterOperatorGreaterThan:     ">",
	v3.FilterOperatorGreaterThanOrEq: ">=",
	v3.FilterOperatorLike:            "LIKE",
	v3.FilterOperatorNotLike:         "NOT LIKE",
	v3.FilterOperatorContains:        "LIKE",
	v3.FilterOperatorNotContains:     "NOT LIKE",
	v3.FilterOperatorRegex:           "match(%s, %s)",
	v3.FilterOperatorNotRegex:        "NOT match(%s, %s)",
	v3.FilterOperatorIn:              "IN",
	v3.FilterOperatorNotIn:           "NOT IN",
	v3.FilterOperatorExists:          "JSON_EXISTS(%s, '$.%s')",
	v3.FilterOperatorNotExists:       "NOT JSON_EXISTS(%s, '$.%s')",
	v3.FilterOperatorHas:             "has(%s, %s)",
	v3.FilterOperatorNotHas:          "NOT has(%s, %s)",
}

func GetJSONFilter(item v3.FilterItem) (string, error) {

	dataType := item.Key.DataType
	isArray := false
	// check if its an array and handle it
	if val, ok := logsV3.ArrayValueTypeMapping[string(item.Key.DataType)]; ok {
		if item.Operator != v3.FilterOperatorHas && item.Operator != v3.FilterOperatorNotHas {
			return "", fmt.Errorf("only has operator is supported for array")
		}
		isArray = true
		dataType = v3.AttributeKeyDataType(val)
	}

	key, err := logsV3.GetJSONFilterKey(item.Key, item.Operator, isArray)
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
			filter = fmt.Sprintf(logsOp, key, logsV3.GetPath(strings.Split(item.Key.Key, ".")[1:]))
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

	pathFilter := logsV3.GetPathIndexFilter(item.Key.Key)
	if pathFilter != "" {
		filters = append(filters, pathFilter)
	}
	if op == v3.FilterOperatorContains ||
		op == v3.FilterOperatorEqual ||
		op == v3.FilterOperatorHas {
		val, ok := item.Value.(string)
		if ok && len(val) >= logsV3.NGRAM_SIZE {
			filters = append(filters, fmt.Sprintf("lower(body) like lower('%%%s%%')", utils.QuoteEscapedString(strings.ToLower(val))))
		}
	}

	// add exists check for non array items as default values of int/float/bool will corrupt the results
	if !isArray && !(item.Operator == v3.FilterOperatorExists || item.Operator == v3.FilterOperatorNotExists) {
		existsFilter := fmt.Sprintf("JSON_EXISTS(body, '$.%s')", logsV3.GetPath(strings.Split(item.Key.Key, ".")[1:]))
		filter = fmt.Sprintf("%s AND %s", existsFilter, filter)
	}

	filters = append(filters, filter)

	return strings.Join(filters, " AND "), nil
}
