package queryBuilderToExpr

import (
	"fmt"
	"reflect"
	"strings"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	expr "github.com/antonmedv/expr"
	"go.uber.org/zap"
)

var logOperatorsToExpr = map[v3.FilterOperator]string{
	v3.FilterOperatorEqual:           "==",
	v3.FilterOperatorNotEqual:        "!=",
	v3.FilterOperatorLessThan:        "<",
	v3.FilterOperatorLessThanOrEq:    "<=",
	v3.FilterOperatorGreaterThan:     ">",
	v3.FilterOperatorGreaterThanOrEq: ">=",
	v3.FilterOperatorContains:        "contains",
	v3.FilterOperatorNotContains:     "not contains",
	v3.FilterOperatorRegex:           "matches",
	v3.FilterOperatorNotRegex:        "not matches",
	v3.FilterOperatorIn:              "in",
	v3.FilterOperatorNotIn:           "not in",
	v3.FilterOperatorExists:          "in",
	v3.FilterOperatorNotExists:       "not in",
	// we dont support like and nlike as of now.
}

func getName(v v3.AttributeKey) string {
	if v.Type == v3.AttributeKeyTypeTag {
		return fmt.Sprintf(`attributes["%s"]`, v.Key)
	} else if v.Type == v3.AttributeKeyTypeResource {
		return fmt.Sprintf(`resource["%s"]`, v.Key)
	}
	return v.Key
}

func getTypeName(v v3.AttributeKeyType) string {
	if v == v3.AttributeKeyTypeTag {
		return "attributes"
	} else if v == v3.AttributeKeyTypeResource {
		return "resource"
	}
	return ""
}

func Parse(filters *v3.FilterSet) (string, error) {
	var res []string
	for _, v := range filters.Items {
		if _, ok := logOperatorsToExpr[v.Operator]; !ok {
			return "", fmt.Errorf("operator not supported")
		}

		name := getName(v.Key)

		var filter string

		switch v.Operator {
		// uncomment following lines when new version of expr is used
		// case v3.FilterOperatorIn, v3.FilterOperatorNotIn:
		// 	filter = fmt.Sprintf("%s %s list%s", name, logOperatorsToExpr[v.Operator], exprFormattedValue(v.Value))

		case v3.FilterOperatorExists, v3.FilterOperatorNotExists:
			filter = fmt.Sprintf("%s %s %s", exprFormattedValue(v.Key.Key), logOperatorsToExpr[v.Operator], getTypeName(v.Key.Type))

		default:
			filter = fmt.Sprintf("%s %s %s", name, logOperatorsToExpr[v.Operator], exprFormattedValue(v.Value))

			if v.Operator == v3.FilterOperatorContains || v.Operator == v3.FilterOperatorNotContains {
				// `contains` and `ncontains` should be case insensitive to match how they work when querying logs.
				filter = fmt.Sprintf(
					"lower(%s) %s lower(%s)",
					name, logOperatorsToExpr[v.Operator], exprFormattedValue(v.Value),
				)
			}

			// Avoid running operators on nil values
			if v.Operator != v3.FilterOperatorEqual && v.Operator != v3.FilterOperatorNotEqual {
				filter = fmt.Sprintf("%s != nil && %s", name, filter)
			}
		}

		// check if the filter is a correct expression language
		_, err := expr.Compile(filter)
		if err != nil {
			return "", err
		}
		res = append(res, filter)
	}

	// check the final filter
	q := strings.Join(res, " "+strings.ToLower(filters.Operator)+" ")
	_, err := expr.Compile(q)
	if err != nil {
		return "", err
	}

	return q, nil
}

func exprFormattedValue(v interface{}) string {
	switch x := v.(type) {
	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", x)
	case float32, float64:
		return fmt.Sprintf("%f", x)
	case string:
		return fmt.Sprintf("\"%s\"", quoteEscapedString(x))
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
				str += fmt.Sprintf("'%s'", quoteEscapedString(sVal.(string)))
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
			return ""
		}
	default:
		zap.L().Error("invalid type for formatted value", zap.Any("type", reflect.TypeOf(x)))
		return ""
	}
}

func quoteEscapedString(str string) string {
	str = strings.ReplaceAll(str, `\`, `\\`)
	str = strings.ReplaceAll(str, `"`, `\"`)
	return str
}
