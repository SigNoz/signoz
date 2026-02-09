package queryBuilderToExpr

import (
	"fmt"
	"maps"
	"reflect"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	expr "github.com/antonmedv/expr"
	"go.uber.org/zap"
)

var (
	CodeExprCompilationFailed = errors.MustNewCode("expr_compilation_failed")
)

var logOperatorsToExpr = map[qbtypes.FilterOperator]string{
	qbtypes.FilterOperatorEqual:           "==",
	qbtypes.FilterOperatorNotEqual:        "!=",
	qbtypes.FilterOperatorLessThan:        "<",
	qbtypes.FilterOperatorLessThanOrEq:    "<=",
	qbtypes.FilterOperatorGreaterThan:     ">",
	qbtypes.FilterOperatorGreaterThanOrEq: ">=",
	qbtypes.FilterOperatorContains:        "contains",
	qbtypes.FilterOperatorNotContains:     "not contains",
	qbtypes.FilterOperatorRegexp:          "matches",
	qbtypes.FilterOperatorNotRegexp:       "not matches",
	qbtypes.FilterOperatorIn:              "in",
	qbtypes.FilterOperatorNotIn:           "not in",
	qbtypes.FilterOperatorExists:          "in",
	qbtypes.FilterOperatorNotExists:       "not in",
	// nlike and like are not supported yet
}

func getName(key *telemetrytypes.TelemetryFieldKey) string {
	if key == nil {
		return ""
	}
	if key.FieldContext == telemetrytypes.FieldContextAttribute {
		return fmt.Sprintf(`attributes["%s"]`, key.Name)
	}
	if key.FieldContext == telemetrytypes.FieldContextResource {
		return fmt.Sprintf(`resource["%s"]`, key.Name)
	}
	return key.Name
}

func parseCondition(c qbtypes.FilterCondition) (string, error) {
	if len(c.Keys) == 0 {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "condition has no keys")
	}
	key := c.Keys[0]
	if _, ok := logOperatorsToExpr[c.Op]; !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "operator not supported: %d", c.Op)
	}

	value := exprFormattedValue(c.Value)
	var filter string

	switch c.Op {
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		// EXISTS/NOT EXISTS checks are special:
		//   - For body fields, we check membership in fromJSON(body) using the JSON field name.
		//   - For attribute/resource fields, we check membership in the appropriate map
		//     ("attributes" or "resource") using the logical field name.
		//   - For intrinsic / top‑level fields (no explicit context), we fall back to
		//     equality against nil (see default case below).
		switch key.FieldContext {
		case telemetrytypes.FieldContextBody:
			// if body is a string and is a valid JSON, then check if the key exists in the JSON
			filter = fmt.Sprintf(`((type(body) == "string" && isJSON(body)) && %s %s %s)`, key.Name, logOperatorsToExpr[c.Op], "fromJSON(body)")

			// if body is a map, then check if the key exists in the map
			operator := qbtypes.FilterOperatorNotEqual
			if c.Op == qbtypes.FilterOperatorNotExists {
				operator = qbtypes.FilterOperatorEqual
			}
			nilCheckFilter := fmt.Sprintf("%s %s nil", key.Name, logOperatorsToExpr[operator])

			// join the two filters with OR
			filter = fmt.Sprintf(`(%s or (type(body) == "map" && (%s)))`, filter, nilCheckFilter)
			// Example: "log.message" in fromJSON(body)
			filter = fmt.Sprintf("%q %s %s", key.Name, logOperatorsToExpr[c.Op], "fromJSON(body)")
		case telemetrytypes.FieldContextAttribute, telemetrytypes.FieldContextResource:
			// Example: "http.method" in attributes
			target := "resource"
			if key.FieldContext == telemetrytypes.FieldContextAttribute {
				target = "attributes"
			}
			filter = fmt.Sprintf("%q %s %s", key.Name, logOperatorsToExpr[c.Op], target)
		default:
			// if type of key is not available; is considered as TOP LEVEL key in OTEL Log Data model hence
			// switch Exist and Not Exists operators with NOT EQUAL and EQUAL respectively
			operator := qbtypes.FilterOperatorNotEqual
			if c.Op == qbtypes.FilterOperatorNotExists {
				operator = qbtypes.FilterOperatorEqual
			}
			filter = fmt.Sprintf("%s %s nil", key.Name, logOperatorsToExpr[operator])
		}
	default:
		filter = fmt.Sprintf("%s %s %s", key.Name, logOperatorsToExpr[c.Op], value)
		if c.Op == qbtypes.FilterOperatorContains || c.Op == qbtypes.FilterOperatorNotContains {
			// `contains` and `ncontains` should be case insensitive to match how they work when querying logs.
			filter = fmt.Sprintf(
				"lower(%s) %s lower(%s)",
				getName(key), logOperatorsToExpr[c.Op], value,
			)
		}

		// Avoid running operators on nil values
		if c.Op != qbtypes.FilterOperatorEqual && c.Op != qbtypes.FilterOperatorNotEqual {
			filter = fmt.Sprintf("%s != nil && %s", getName(key), filter)
		}
	}

	_, err := expr.Compile(filter)
	if err != nil {
		return "", err
	}
	return filter, nil
}

// Parse converts the QB filter Expression (query builder expression string) into
// the Expr expression string used by the collector. It parses the QB expression
// into a FilterExprNode tree, then serializes that tree to the Expr dialect.
func Parse(filter *qbtypes.Filter) (string, error) {
	if filter == nil || strings.TrimSpace(filter.Expression) == "" {
		return "", nil
	}
	node, err := querybuilder.ExtractFilterExprTree(filter.Expression)
	if err != nil {
		return "", err
	}
	if node == nil {
		return "", nil
	}

	for _, condition := range node.Flatten() {
		for _, key := range condition.Keys {
			_, found := telemetrylogs.IntrinsicFields[key.Name]
			if key.FieldContext == telemetrytypes.FieldContextUnspecified && !found {
				return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "field %q in filter expression must include a context prefix (attribute., resource., body.) OR can be one of the following fields: %v", key.Name, maps.Keys(telemetrylogs.IntrinsicFields))
			}
		}
	}

	return nodeToExpr(node)
}

func nodeToExpr(node *qbtypes.FilterExprNode) (string, error) {
	if node == nil {
		return "", nil
	}

	switch node.Op {
	case qbtypes.LogicalOpLeaf:
		var parts []string
		for _, c := range node.Conditions {
			s, err := parseCondition(c)
			if err != nil {
				return "", err
			}
			parts = append(parts, s)
		}
		if len(parts) == 0 {
			return "", nil
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " and ")), nil
	case qbtypes.LogicalOpAnd:
		var parts []string
		for _, child := range node.Children {
			if child == nil {
				continue
			}
			s, err := nodeToExpr(child)
			if err != nil {
				return "", err
			}
			parts = append(parts, s)
		}
		if len(parts) == 0 {
			return "", nil
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " and ")), nil
	case qbtypes.LogicalOpOr:
		var parts []string
		for _, child := range node.Children {
			if child == nil {
				continue
			}
			s, err := nodeToExpr(child)
			if err != nil {
				return "", err
			}
			parts = append(parts, s)
		}
		if len(parts) == 0 {
			return "", nil
		}
		return fmt.Sprintf("(%s)", strings.Join(parts, " or ")), nil
	default:
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported logical op: %s", node.Op)
	}
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
	case []any:
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
