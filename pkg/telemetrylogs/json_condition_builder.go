package telemetrylogs

import (
	"fmt"
	"slices"
	"strings"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	CodeCurrentNodeNil           = errors.MustNewCode("current_node_nil")
	CodeChildNodeNil             = errors.MustNewCode("child_node_nil")
	CodeNestedExpressionsEmpty   = errors.MustNewCode("nested_expressions_empty")
	CodeGroupByPlanEmpty         = errors.MustNewCode("group_by_plan_empty")
	CodeArrayMapExpressionsEmpty = errors.MustNewCode("array_map_expressions_empty")
	CodePromotedPlanMissing      = errors.MustNewCode("promoted_plan_missing")
	CodeArrayNavigationFailed    = errors.MustNewCode("array_navigation_failed")
)

type jsonConditionBuilder struct {
	key       *telemetrytypes.TelemetryFieldKey
	valueType telemetrytypes.JSONDataType
}

func NewJSONConditionBuilder(key *telemetrytypes.TelemetryFieldKey, valueType telemetrytypes.FieldDataType) *jsonConditionBuilder {
	return &jsonConditionBuilder{key: key, valueType: telemetrytypes.MappingFieldDataTypeToJSONDataType[valueType]}
}

// BuildCondition builds the full WHERE condition for body_v2 JSON paths.
func (c *jsonConditionBuilder) buildJSONCondition(operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	baseCond, err := c.emitPlannedCondition(operator, value, sb)
	if err != nil {
		return "", err
	}

	// path index
	if operator.AddDefaultExistsFilter() {
		pathIndex := fmt.Sprintf(`has(%s, '%s')`, schemamigrator.JSONPathsIndexExpr(LogsV2BodyV2Column), c.key.ArrayParentPaths()[0])
		return sb.And(baseCond, pathIndex), nil
	}

	return baseCond, nil
}

func (c *jsonConditionBuilder) emitPlannedCondition(operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Build traversal + terminal recursively per-hop
	conditions := []string{}
	for _, node := range c.key.JSONPlan {
		condition, err := c.recurseArrayHops(node, operator, value, sb)
		if err != nil {
			return "", err
		}
		conditions = append(conditions, condition)
	}

	return sb.Or(conditions...), nil
}

func (c *jsonConditionBuilder) recurseArrayHops(current *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	if current == nil {
		return "", errors.NewInternalf(CodeArrayNavigationFailed, "navigation failed, current node is nil")
	}

	if current.IsTerminal {
		terminalCond, err := c.buildTerminalCondition(current, operator, value, sb)
		if err != nil {
			return "", err
		}
		return terminalCond, nil
	}

	// apply NOT at top level arrayExists so that any subsequent arrayExists fails we count it as true (matching log)
	yes, operator := applyNotCondition(operator)
	condition, err := c.buildAccessNodeBranches(current, operator, value, sb)
	if err != nil {
		return "", err
	}

	if yes {
		return sb.Not(condition), nil
	}

	return condition, nil
}

func applyNotCondition(operator qbtypes.FilterOperator) (bool, qbtypes.FilterOperator) {
	if operator.IsNegativeOperator() {
		return true, operator.Inverse()
	}
	return false, operator
}

// buildAccessNodeBranches builds conditions for each branch of the access node.
func (c *jsonConditionBuilder) buildAccessNodeBranches(current *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	if current == nil {
		return "", errors.NewInternalf(CodeArrayNavigationFailed, "navigation failed, current node is nil")
	}

	currAlias := current.Alias()
	fieldPath := current.FieldPath()
	// Determine availability of Array(JSON) and Array(Dynamic) at this hop
	hasArrayJSON := current.Branches[telemetrytypes.BranchJSON] != nil
	hasArrayDynamic := current.Branches[telemetrytypes.BranchDynamic] != nil

	// Then, at this hop, compute child per branch and wrap
	branches := make([]string, 0, 2)
	if hasArrayJSON {
		jsonArrayExpr := fmt.Sprintf("dynamicElement(%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')", fieldPath, current.MaxDynamicTypes, current.MaxDynamicPaths)
		childGroupJSON, err := c.recurseArrayHops(current.Branches[telemetrytypes.BranchJSON], operator, value, sb)
		if err != nil {
			return "", err
		}
		branches = append(branches, fmt.Sprintf("arrayExists(%s-> %s, %s)", currAlias, childGroupJSON, jsonArrayExpr))
	}
	if hasArrayDynamic {
		dynBaseExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", fieldPath)
		dynFilteredExpr := fmt.Sprintf("arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)

		// Create the Query for Dynamic array
		childGroupDyn, err := c.recurseArrayHops(current.Branches[telemetrytypes.BranchDynamic], operator, value, sb)
		if err != nil {
			return "", err
		}
		branches = append(branches, fmt.Sprintf("arrayExists(%s-> %s, %s)", currAlias, childGroupDyn, dynFilteredExpr))
	}

	if len(branches) == 1 {
		return branches[0], nil
	}
	return sb.Or(branches...), nil
}

// buildTerminalCondition creates the innermost condition.
func (c *jsonConditionBuilder) buildTerminalCondition(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	if node.TerminalConfig.ElemType.IsArray {
		// Note: here applyNotCondition will return true only if; top level path is an array; and operator is a negative operator
		// Otherwise this code will be triggered by buildAccessNodeBranches; Where operator would've been already inverted if needed.
		yes, operator := applyNotCondition(operator)
		cond, err := c.buildTerminalArrayCondition(node, operator, value, sb)
		if err != nil {
			return "", err
		}

		if yes {
			return sb.Not(cond), nil
		}
		return cond, nil
	}

	return c.buildPrimitiveTerminalCondition(node, operator, value, sb)
}

func getEmptyValue(elemType telemetrytypes.JSONDataType) any {
	switch elemType {
	case telemetrytypes.String:
		return ""
	case telemetrytypes.Int64, telemetrytypes.Float64, telemetrytypes.Bool:
		return 0
	default:
		return nil
	}
}

func (c *jsonConditionBuilder) terminalIndexedCondition(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	fieldPath := node.FieldPath()
	if strings.Contains(fieldPath, telemetrytypes.ArraySepSuffix) {
		return "", errors.NewInternalf(CodeArrayNavigationFailed, "can not build index condition for array field %s", fieldPath)
	}
	if !node.IsTerminal {
		return "", errors.NewInternalf(errors.CodeInvalidInput, "can not build index condition for non-terminal node %s", fieldPath)
	}

	indexedExpr := schemamigrator.JSONSubColumnIndexExpr(node.Parent.Name, node.Name, node.TerminalConfig.ElemType.StringValue())
	// TODO(Piyush): indexedExpr should not be formatted here instead value should be formatted
	// else ClickHouse may not utilize index
	indexedExpr, formattedValue := querybuilder.DataTypeCollisionHandledFieldName(node.TerminalConfig.Key, value, indexedExpr, operator)
	return c.applyOperator(sb, indexedExpr, operator, formattedValue)
}

// buildPrimitiveTerminalCondition builds the condition if the terminal node is a primitive type
// it handles the data type collisions and utilizes indexes for the condition if available.
func (c *jsonConditionBuilder) buildPrimitiveTerminalCondition(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	fieldPath := node.FieldPath()
	conditions := []string{}

	// Utilize indexes when available, except for EXISTS/NOT EXISTS checks.
	// Indexed columns always store a default empty value for absent fields (e.g. "" for strings,
	// 0 for numbers), so using the index for existence checks would incorrectly exclude rows where
	// the field genuinely holds the empty/zero value.
	//
	// Note: indexing is also skipped for Array Nested fields because they cannot be indexed.
	indexed := slices.ContainsFunc(node.TerminalConfig.Key.Indexes, func(index telemetrytypes.JSONDataTypeIndex) bool {
		return index.Type == node.TerminalConfig.ElemType
	})
	isExistsCheck := operator == qbtypes.FilterOperatorExists || operator == qbtypes.FilterOperatorNotExists
	if node.TerminalConfig.ElemType.IndexSupported && indexed && !isExistsCheck {
		indexCond, err := c.terminalIndexedCondition(node, operator, value, sb)
		if err != nil {
			return "", err
		}
		// With a concrete non-zero value the index condition is self-contained.
		if value != nil && value != getEmptyValue(node.TerminalConfig.ElemType) {
			return indexCond, nil
		}
		// The value is nil or the type's zero/empty value. Because indexed columns always store
		// that zero value for absent fields, the index alone cannot distinguish "field is absent"
		// from "field exists with zero value". Append a path-existence check (IS NOT NULL) as a
		// second condition and AND them together.
		conditions = append(conditions, indexCond)
		operator = qbtypes.FilterOperatorExists
	}

	var formattedValue = value
	if operator.IsStringSearchOperator() {
		formattedValue = querybuilder.FormatValueForContains(value)
	}

	fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, node.TerminalConfig.ElemType.StringValue())

	// For non-nested paths with a negative comparison operator (e.g. !=, NOT LIKE, NOT IN),
	// wrap in assumeNotNull so ClickHouse treats absent paths as the zero value rather than NULL,
	// which would otherwise cause them to be silently dropped from results.
	// NOT EXISTS is excluded: we want a true NULL check there, not a zero-value stand-in.
	//
	// Note: for nested array paths, buildAccessNodeBranches already inverts the operator before
	// reaching here, so IsNonNestedPath() guards against double-applying the wrapping.
	if node.IsNonNestedPath() && operator.IsNegativeOperator() && operator != qbtypes.FilterOperatorNotExists {
		fieldExpr = assumeNotNull(fieldExpr)
	}

	fieldExpr, formattedValue = querybuilder.DataTypeCollisionHandledFieldName(node.TerminalConfig.Key, formattedValue, fieldExpr, operator)
	cond, err := c.applyOperator(sb, fieldExpr, operator, formattedValue)
	if err != nil {
		return "", err
	}
	conditions = append(conditions, cond)
	if len(conditions) > 1 {
		return sb.And(conditions...), nil
	}
	return conditions[0], nil
}

func (c *jsonConditionBuilder) buildTerminalArrayCondition(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	conditions := []string{}
	// if operator is a String search Operator, then we need to build one more String comparison condition along with the Strict match condition
	if operator.IsStringSearchOperator() {
		formattedValue := querybuilder.FormatValueForContains(value)
		arrayCond, err := c.buildArrayMembershipCondition(node, operator, formattedValue, sb)
		if err != nil {
			return "", err
		}
		conditions = append(conditions, arrayCond)

		// switch operator for array membership checks
		switch operator {
		case qbtypes.FilterOperatorContains:
			operator = qbtypes.FilterOperatorEqual
		case qbtypes.FilterOperatorNotContains:
			operator = qbtypes.FilterOperatorNotEqual
		}
	}

	arrayCond, err := c.buildArrayMembershipCondition(node, operator, value, sb)
	if err != nil {
		return "", err
	}
	conditions = append(conditions, arrayCond)
	if len(conditions) > 1 {
		return sb.Or(conditions...), nil
	}

	return conditions[0], nil
}

// buildArrayMembershipCondition builds condition of the part where Arrays becomes primitive typed Arrays
// e.g. [300, 404, 500], and value operations will work on the array elements.
func (c *jsonConditionBuilder) buildArrayMembershipCondition(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	arrayPath := node.FieldPath()
	// create typed array out of a dynamic array
	filteredDynamicExpr := func() string {
		baseArrayDynamicExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", arrayPath)
		return fmt.Sprintf("arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), %s)",
			baseArrayDynamicExpr)
	}
	typedArrayExpr := func() string {
		return fmt.Sprintf("dynamicElement(%s, '%s')", arrayPath, node.TerminalConfig.ElemType.StringValue())
	}

	var arrayExpr string
	if node.TerminalConfig.ElemType == telemetrytypes.ArrayDynamic {
		arrayExpr = filteredDynamicExpr()
	} else {
		arrayExpr = typedArrayExpr()
	}

	key := "x"
	fieldExpr, value := querybuilder.DataTypeCollisionHandledFieldName(node.TerminalConfig.Key, value, key, operator)
	op, err := c.applyOperator(sb, fieldExpr, operator, value)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("arrayExists(%s -> %s, %s)", key, op, arrayExpr), nil
}

func (c *jsonConditionBuilder) applyOperator(sb *sqlbuilder.SelectBuilder, fieldExpr string, operator qbtypes.FilterOperator, value any) (string, error) {
	switch operator {
	case qbtypes.FilterOperatorEqual:
		return sb.E(fieldExpr, value), nil
	case qbtypes.FilterOperatorNotEqual:
		return sb.NE(fieldExpr, value), nil
	case qbtypes.FilterOperatorGreaterThan:
		return sb.G(fieldExpr, value), nil
	case qbtypes.FilterOperatorGreaterThanOrEq:
		return sb.GE(fieldExpr, value), nil
	case qbtypes.FilterOperatorLessThan:
		return sb.LT(fieldExpr, value), nil
	case qbtypes.FilterOperatorLessThanOrEq:
		return sb.LE(fieldExpr, value), nil
	case qbtypes.FilterOperatorLike:
		return sb.Like(fieldExpr, value), nil
	case qbtypes.FilterOperatorNotLike:
		return sb.NotLike(fieldExpr, value), nil
	case qbtypes.FilterOperatorILike:
		return sb.ILike(fieldExpr, value), nil
	case qbtypes.FilterOperatorNotILike:
		return sb.NotILike(fieldExpr, value), nil
	case qbtypes.FilterOperatorRegexp:
		return fmt.Sprintf("match(%s, %s)", fieldExpr, sb.Var(value)), nil
	case qbtypes.FilterOperatorNotRegexp:
		return fmt.Sprintf("NOT match(%s, %s)", fieldExpr, sb.Var(value)), nil
	case qbtypes.FilterOperatorContains:
		return sb.ILike(fieldExpr, fmt.Sprintf("%%%v%%", value)), nil
	case qbtypes.FilterOperatorNotContains:
		return sb.NotILike(fieldExpr, fmt.Sprintf("%%%v%%", value)), nil
	case qbtypes.FilterOperatorIn, qbtypes.FilterOperatorNotIn:
		values, ok := value.([]any)
		if !ok {
			values = []any{value}
		}
		if operator == qbtypes.FilterOperatorIn {
			return sb.In(fieldExpr, values...), nil
		}
		return sb.NotIn(fieldExpr, values...), nil
	case qbtypes.FilterOperatorExists:
		return sb.IsNotNull(fieldExpr), nil
	case qbtypes.FilterOperatorNotExists:
		return sb.IsNull(fieldExpr), nil
	// between and not between
	case qbtypes.FilterOperatorBetween, qbtypes.FilterOperatorNotBetween:
		values, ok := value.([]any)
		if !ok {
			return "", qbtypes.ErrBetweenValues
		}
		if len(values) != 2 {
			return "", qbtypes.ErrBetweenValues
		}
		if operator == qbtypes.FilterOperatorBetween {
			return sb.Between(fieldExpr, values[0], values[1]), nil
		}
		return sb.NotBetween(fieldExpr, values[0], values[1]), nil
	default:
		return "", qbtypes.ErrUnsupportedOperator
	}
}

func assumeNotNull(fieldExpr string) string {
	return fmt.Sprintf("assumeNotNull(%s)", fieldExpr)
}
