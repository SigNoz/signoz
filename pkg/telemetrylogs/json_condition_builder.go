package telemetrylogs

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	CodeCurrentNodeNil           = errors.MustNewCode("current_node_nil")
	CodeNextNodeNil              = errors.MustNewCode("next_node_nil")
	CodeNestedExpressionsEmpty   = errors.MustNewCode("nested_expressions_empty")
	CodeGroupByPlanEmpty         = errors.MustNewCode("group_by_plan_empty")
	CodeArrayMapExpressionsEmpty = errors.MustNewCode("array_map_expressions_empty")
	CodePromotedPlanMissing      = errors.MustNewCode("promoted_plan_missing")
	CodeArrayNavigationFailed    = errors.MustNewCode("array_navigation_failed")
)

// BuildCondition builds the full WHERE condition for body_json JSON paths
func (c *conditionBuilder) buildJSONCondition(ctx context.Context, key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {

	plan, err := PlanJSON(ctx, key, operator, value, c.metadataStore)
	if err != nil {
		return "", err
	}

	conditions := []string{}
	for _, plan := range plan {
		condition, err := c.emitPlannedCondition(plan, operator, value, sb)
		if err != nil {
			return "", err
		}
		conditions = append(conditions, condition)
	}
	return sb.Or(conditions...), nil
}

// emitPlannedCondition handles paths with array traversal
func (c *conditionBuilder) emitPlannedCondition(plan *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Build traversal + terminal recursively per-hop
	compiled, err := c.recurseArrayHops(plan, operator, value, sb)
	if err != nil {
		return "", err
	}
	return compiled, nil
}

// buildTerminalCondition creates the innermost condition
func (c *conditionBuilder) buildTerminalCondition(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	if node.TerminalConfig.ElemType.IsArray {
		conditions := []string{}
		// if the value type is not an array
		// TODO(piyush): Confirm the Query built for Array case and add testcases for it later
		if !node.TerminalConfig.ValueType.IsArray {
			// if operator is a String search Operator, then we need to build one more String comparison condition along with the Strict match condition
			if operator.IsStringSearchOperator() {
				formattedValue := querybuilder.FormatValueForContains(value)
				arrayCond, err := c.buildArrayMembershipCondition(node, operator, formattedValue, sb)
				if err != nil {
					return "", err
				}
				conditions = append(conditions, arrayCond)
			}

			// switch operator for array membership checks
			switch operator {
			case qbtypes.FilterOperatorContains, qbtypes.FilterOperatorIn:
				operator = qbtypes.FilterOperatorEqual
			case qbtypes.FilterOperatorNotContains, qbtypes.FilterOperatorNotIn:
				operator = qbtypes.FilterOperatorNotEqual
			}
		}

		arrayCond, err := c.buildArrayMembershipCondition(node, operator, value, sb)
		if err != nil {
			return "", err
		}
		conditions = append(conditions, arrayCond)
		// or the conditions together
		return sb.Or(conditions...), nil
	}

	return c.buildPrimitiveTerminalCondition(node, operator, value, sb)
}

// buildPrimitiveTerminalCondition builds the condition if the terminal node is a primitive type
// it handles the data type collisions and utilizes indexes for the condition if available
func (c *conditionBuilder) buildPrimitiveTerminalCondition(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	fieldPath := node.FieldPath()
	conditions := []string{}
	var formattedValue any = value
	if operator.IsStringSearchOperator() {
		formattedValue = querybuilder.FormatValueForContains(value)
	}

	elemType := node.TerminalConfig.ElemType
	fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, elemType.StringValue())
	fieldExpr, formattedValue = querybuilder.DataTypeCollisionHandledFieldName(node.TerminalConfig.Key, formattedValue, fieldExpr, operator)

	// utilize indexes for the condition if available
	indexed := slices.ContainsFunc(node.TerminalConfig.Key.Indexes, func(index telemetrytypes.JSONDataTypeIndex) bool {
		return index.Type == elemType && index.ColumnExpression == fieldPath
	})
	if elemType.IndexSupported && indexed {
		indexedExpr := assumeNotNull(fieldPath, elemType)
		emptyValue := func() any {
			switch elemType {
			case telemetrytypes.String:
				return ""
			case telemetrytypes.Int64, telemetrytypes.Float64, telemetrytypes.Bool:
				return 0
			default:
				return nil
			}
		}()

		// switch the operator and value for exists and not exists
		switch operator {
		case qbtypes.FilterOperatorExists:
			operator = qbtypes.FilterOperatorNotEqual
			value = emptyValue
		case qbtypes.FilterOperatorNotExists:
			operator = qbtypes.FilterOperatorEqual
			value = emptyValue
		default:
			// do nothing
		}

		indexedExpr, indexedComparisonValue := querybuilder.DataTypeCollisionHandledFieldName(node.TerminalConfig.Key, formattedValue, indexedExpr, operator)
		cond, err := c.applyOperator(sb, indexedExpr, operator, indexedComparisonValue)
		if err != nil {
			return "", err
		}

		// if qb has a definitive value, we can skip adding a condition to
		// check the existence of the path in the json column
		if value != emptyValue {
			return cond, nil
		}

		conditions = append(conditions, cond)
		// Switch operator to EXISTS since indexed paths on assumedNotNull, indexes will always have a default value
		// So we flip the operator to Exists and filter the rows that actually have the value
		operator = qbtypes.FilterOperatorExists
	}

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

// buildArrayMembershipCondition handles array membership checks
func (c *conditionBuilder) buildArrayMembershipCondition(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	arrayPath := node.FieldPath()
	localKeyCopy := *node.TerminalConfig.Key
	// create typed array out of a dynamic array
	filteredDynamicExpr := func() string {
		// Change the field data type from []dynamic to the value type
		// since we've filtered the value type out of the dynamic array, we need to change the field data corresponding to the value type
		localKeyCopy.FieldDataType = telemetrytypes.MappingJSONDataTypeToFieldDataType[telemetrytypes.ScalerTypeToArrayType[node.TerminalConfig.ValueType]]

		baseArrayDynamicExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", arrayPath)
		return fmt.Sprintf("arrayMap(x->dynamicElement(x, '%s'), arrayFilter(x->(dynamicType(x) = '%s'), %s))",
			node.TerminalConfig.ValueType.StringValue(),
			node.TerminalConfig.ValueType.StringValue(),
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

	fieldExpr, value := querybuilder.DataTypeCollisionHandledFieldName(&localKeyCopy, value, "x", operator)
	op, err := c.applyOperator(sb, fieldExpr, operator, value)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("arrayExists(%s -> %s, %s)", fieldExpr, op, arrayExpr), nil
}

// recurseArrayHops recursively builds array traversal conditions
func (c *conditionBuilder) recurseArrayHops(current *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
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

func (c *conditionBuilder) applyOperator(sb *sqlbuilder.SelectBuilder, fieldExpr string, operator qbtypes.FilterOperator, value any) (string, error) {
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
		// emulate IN/NOT IN using OR/AND over equals to leverage indexes consistently
		values, ok := value.([]any)
		if !ok {
			values = []any{value}
		}
		conds := []string{}
		for _, v := range values {
			if operator == qbtypes.FilterOperatorIn {
				conds = append(conds, sb.E(fieldExpr, v))
			} else {
				conds = append(conds, sb.NE(fieldExpr, v))
			}
		}
		if operator == qbtypes.FilterOperatorIn {
			return sb.Or(conds...), nil
		}
		return sb.And(conds...), nil
	case qbtypes.FilterOperatorExists:
		return fmt.Sprintf("%s IS NOT NULL", fieldExpr), nil
	case qbtypes.FilterOperatorNotExists:
		return fmt.Sprintf("%s IS NULL", fieldExpr), nil
	default:
		return "", qbtypes.ErrUnsupportedOperator
	}
}

// GroupByArrayJoinInfo contains information about array joins needed for GroupBy
type GroupByArrayJoinInfo struct {
	ArrayJoinClauses []string // ARRAY JOIN clauses to add to FROM clause
	TerminalExpr     string   // Terminal field expression for SELECT/GROUP BY
}

// BuildGroupBy builds GroupBy information for body JSON fields using arrayConcat pattern
//
// BuildGroupBy was designed to be used for group by queries on body JSON fields existings inside arrays but
// currently it is not used anywhere, considering this case suits more to Data Engineering instead of Observability space.
// This code should be removed in future.
func (c *conditionBuilder) BuildGroupBy(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*GroupByArrayJoinInfo, error) {
	path := strings.TrimPrefix(key.Name, telemetrytypes.BodyJSONStringSearchPrefix)

	plan, err := PlanJSON(ctx, key, qbtypes.FilterOperatorExists, nil, c.metadataStore)
	if err != nil {
		return nil, err
	}

	if len(plan) == 0 {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput,
			"Could not find any valid paths for: %s", path)
	}

	if plan[0].IsTerminal {
		node := plan[0]

		expr := fmt.Sprintf("dynamicElement(%s, '%s')", node.FieldPath(), node.TerminalConfig.ElemType.StringValue())
		if key.Materialized {
			if len(plan) < 2 {
				return nil, errors.Newf(errors.TypeUnexpected, CodePromotedPlanMissing,
					"plan length is less than 2 for promoted path: %s", path)
			}

			// promoted column first then body_json column
			// TODO(Piyush): Change this in future for better performance
			expr = fmt.Sprintf("coalesce(%s, %s)",
				fmt.Sprintf("dynamicElement(%s, '%s')", plan[1].FieldPath(), plan[1].TerminalConfig.ElemType.StringValue()),
				expr,
			)
		}

		return &GroupByArrayJoinInfo{
			ArrayJoinClauses: []string{},
			TerminalExpr:     expr,
		}, nil
	}

	// Build arrayConcat pattern directly from the tree structure
	arrayConcatExpr, err := c.buildArrayConcat(plan)
	if err != nil {
		return nil, err
	}

	// Create single ARRAY JOIN clause with arrayFlatten
	arrayJoinClause := fmt.Sprintf("ARRAY JOIN %s AS `%s`", arrayConcatExpr, key.Name)

	return &GroupByArrayJoinInfo{
		ArrayJoinClauses: []string{arrayJoinClause},
		TerminalExpr:     fmt.Sprintf("`%s`", key.Name),
	}, nil
}

// buildArrayConcat builds the arrayConcat pattern directly from the tree structure
func (c *conditionBuilder) buildArrayConcat(plan telemetrytypes.JSONAccessPlan) (string, error) {
	if len(plan) == 0 {
		return "", errors.Newf(errors.TypeInternal, CodeGroupByPlanEmpty, "group by plan is empty while building arrayConcat")
	}

	// Build arrayMap expressions for ALL available branches at the root level
	var arrayMapExpressions []string
	for _, node := range plan {
		hasJSON := node.Branches[telemetrytypes.BranchJSON] != nil
		hasDynamic := node.Branches[telemetrytypes.BranchDynamic] != nil

		if hasJSON {
			jsonExpr, err := c.buildArrayMap(node, telemetrytypes.BranchJSON)
			if err != nil {
				return "", err
			}
			arrayMapExpressions = append(arrayMapExpressions, jsonExpr)
		}

		if hasDynamic {
			dynamicExpr, err := c.buildArrayMap(node, telemetrytypes.BranchDynamic)
			if err != nil {
				return "", err
			}
			arrayMapExpressions = append(arrayMapExpressions, dynamicExpr)
		}
	}
	if len(arrayMapExpressions) == 0 {
		return "", errors.Newf(errors.TypeInternal, CodeArrayMapExpressionsEmpty, "array map expressions are empty while building arrayConcat")
	}

	// Build the arrayConcat expression
	arrayConcatExpr := fmt.Sprintf("arrayConcat(%s)", strings.Join(arrayMapExpressions, ", "))

	// Wrap with arrayFlatten
	arrayFlattenExpr := fmt.Sprintf("arrayFlatten(%s)", arrayConcatExpr)

	return arrayFlattenExpr, nil
}

// buildArrayMap builds the arrayMap expression for a specific branch, handling all sub-branches
func (c *conditionBuilder) buildArrayMap(currentNode *telemetrytypes.JSONAccessNode, branchType telemetrytypes.JSONAccessBranchType) (string, error) {
	if currentNode == nil {
		return "", errors.Newf(errors.TypeInternal, CodeCurrentNodeNil, "current node is nil while building arrayMap")
	}

	nextNode := currentNode.Branches[branchType]
	if nextNode == nil {
		return "", errors.Newf(errors.TypeInternal, CodeNextNodeNil, "next node is nil while building arrayMap")
	}

	// Build the array expression for this level
	var arrayExpr string
	if branchType == telemetrytypes.BranchJSON {
		// Array(JSON) branch
		arrayExpr = fmt.Sprintf("dynamicElement(%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')",
			currentNode.FieldPath(), currentNode.MaxDynamicTypes, currentNode.MaxDynamicPaths)
	} else {
		// Array(Dynamic) branch - filter for JSON objects
		dynBaseExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", currentNode.FieldPath())
		arrayExpr = fmt.Sprintf("arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)
	}

	// If this is the terminal level, return the simple arrayMap
	if nextNode.IsTerminal {
		dynamicElementExpr := fmt.Sprintf("dynamicElement(%s, '%s')", nextNode.FieldPath(),
			nextNode.TerminalConfig.ElemType.StringValue(),
		)
		return fmt.Sprintf("arrayMap(%s->%s, %s)", currentNode.Alias(), dynamicElementExpr, arrayExpr), nil
	}

	// For non-terminal nodes, we need to handle ALL possible branches at the next level
	var nestedExpressions []string
	hasJSON := nextNode.Branches[telemetrytypes.BranchJSON] != nil
	hasDynamic := nextNode.Branches[telemetrytypes.BranchDynamic] != nil

	if hasJSON {
		jsonNested, err := c.buildArrayMap(nextNode, telemetrytypes.BranchJSON)
		if err != nil {
			return "", err
		}
		nestedExpressions = append(nestedExpressions, jsonNested)
	}

	if hasDynamic {
		dynamicNested, err := c.buildArrayMap(nextNode, telemetrytypes.BranchDynamic)
		if err != nil {
			return "", err
		}
		nestedExpressions = append(nestedExpressions, dynamicNested)
	}

	// If we have multiple nested expressions, we need to concat them
	var nestedExpr string
	if len(nestedExpressions) == 1 {
		nestedExpr = nestedExpressions[0]
	} else if len(nestedExpressions) > 1 {
		// This shouldn't happen in our current tree structure, but handle it just in case
		nestedExpr = fmt.Sprintf("arrayConcat(%s)", strings.Join(nestedExpressions, ", "))
	} else {
		return "", errors.Newf(errors.TypeInternal, CodeNestedExpressionsEmpty, "nested expressions are empty while building arrayMap")
	}

	return fmt.Sprintf("arrayMap(%s->%s, %s)", currentNode.Alias(), nestedExpr, arrayExpr), nil
}

func assumeNotNull(column string, elemType telemetrytypes.JSONDataType) string {
	return fmt.Sprintf("assumeNotNull(dynamicElement(%s, '%s'))", column, elemType.StringValue())
}
