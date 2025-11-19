package telemetrylogs

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/huandu/go-sqlbuilder"
)

var (
	CodeCurrentNodeNil           = errors.MustNewCode("current_node_nil")
	CodeNextNodeNil              = errors.MustNewCode("next_node_nil")
	CodeNestedExpressionsEmpty   = errors.MustNewCode("nested_expressions_empty")
	CodeGroupByPlanEmpty         = errors.MustNewCode("group_by_plan_empty")
	CodeArrayMapExpressionsEmpty = errors.MustNewCode("array_map_expressions_empty")
	CodePromotedPlanMissing      = errors.MustNewCode("promoted_plan_missing")
	CodeLRUCacheCreateFailed     = errors.MustNewCode("lru_cache_create_failed")
)

type PathType struct {
	Path     string `ch:"path"`
	Type     string `ch:"type"`
	LastSeen uint64 `ch:"last_seen"`
}

type JSONQueryBuilder struct {
	telemetryStore       telemetrystore.TelemetryStore
	cache                *lru.Cache[string, *utils.ConcurrentSet[telemetrytypes.JSONDataType]] // map[string]*utils.ConcurrentSet[telemetrytypes.JSONDataType]
	lastSeen             uint64
	promotedPaths        sync.Map     // map[string]struct{} of promoted JSON paths
	stringIndexedColumns atomic.Value // map[string]string of string indexed columns

	logger *slog.Logger
}

func NewJSONQueryBuilder(ctx context.Context,
	telemetryStore telemetrystore.TelemetryStore, logger *slog.Logger) (*JSONQueryBuilder, error) {
	lruCache, err := lru.New[string, *utils.ConcurrentSet[telemetrytypes.JSONDataType]](10000)
	if err != nil {
		return nil, errors.WrapInternalf(err, CodeLRUCacheCreateFailed, "failed to create LRU cache: %s", err)
	}

	builder := &JSONQueryBuilder{telemetryStore: telemetryStore, cache: lruCache, logger: logger}

	builder.stringIndexedColumns.Store(make(map[string]string))

	return builder, nil
}

// getTypeSet checks cache first, then fetches from DB synchronously if not found
func (b *JSONQueryBuilder) getTypeSet(ctx context.Context, path string) ([]telemetrytypes.JSONDataType, error) {
	// Check cache first
	if cachedSet, exists := b.cache.Get(path); exists {
		if cachedSet != nil && cachedSet.Len() > 0 {
			return cachedSet.ToSlice(), nil
		}
	}

	return nil, nil
}

// IsPromoted reports whether a JSON path is present in the promoted paths set.
func (b *JSONQueryBuilder) IsPromoted(path string) bool {
	firstLeafNode := strings.Split(path, ArraySep)[0]
	_, ok := b.promotedPaths.Load(firstLeafNode)
	return ok
}

// BuildCondition builds the full WHERE condition for body_json JSON paths
func (b *JSONQueryBuilder) BuildCondition(ctx context.Context, key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {

	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)
	plan, err := PlanJSON(ctx, path, operator, value, b.IsPromoted(path), b.getTypeSet)
	if err != nil {
		return "", err
	}

	conditions := []string{}
	for _, plan := range plan {
		condition, err := b.emitPlannedCondition(plan, operator, value, sb)
		if err != nil {
			return "", err
		}
		conditions = append(conditions, condition)
	}
	return sb.Or(conditions...), nil
}

// emitPlannedCondition handles paths with array traversal
func (b *JSONQueryBuilder) emitPlannedCondition(plan *Node, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Build traversal + terminal recursively per-hop
	compiled, err := b.recurseArrayHops(plan, operator, value, sb)
	if err != nil {
		return "", err
	}

	sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, compiled))
	return compiled, nil
}

// buildTerminalCondition creates the innermost condition
func (b *JSONQueryBuilder) buildTerminalCondition(node *Node, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Use the parent's alias + current field name for the full path
	fieldPath := node.FieldPath()

	switch operator {
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		return b.applyOperator(sb, fieldPath, operator, value)

	case qbtypes.FilterOperatorContains, qbtypes.FilterOperatorNotContains, qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike, qbtypes.FilterOperatorNotLike:
		if node.TerminalConfig.PreferArrayAtEnd {
			return b.buildArrayMembershipCondition(node, operator, value, sb)
		}
		elemType := node.TerminalConfig.ElemType
		fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, elemType.StringValue())

		// if elemType is string and this field path is string indexed, use the string indexing expression
		if expr, found := b.stringIndexedColumns.Load().(map[string]string)[fieldPath]; found && elemType == telemetrytypes.String {
			fieldExpr = expr
		}

		return b.applyOperator(sb, fieldExpr, operator, value)
	default:
		valueType := node.TerminalConfig.ValueType
		fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, valueType.StringValue())
		return b.applyOperator(sb, fieldExpr, operator, value)
	}
}

// buildArrayMembershipCondition handles array membership checks
func (b *JSONQueryBuilder) buildArrayMembershipCondition(plan *Node, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	arrayPath := plan.FieldPath()

	// Check if we should use Array(Dynamic) filtering or typed array
	cached := plan.AvailableTypes

	// Check if we have a typed array available for this element type
	typedArrayType := telemetrytypes.ScalerTypeToArrayType[plan.TerminalConfig.ValueType]
	hasTypedArray := slices.Contains(cached, typedArrayType)
	hasArrayDynamic := slices.Contains(cached, telemetrytypes.ArrayDynamic)

	// create typed array out of a dynamic array
	filteredDynamicExpr := func() string {
		baseArrayDynamicExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", arrayPath)
		return fmt.Sprintf("arrayMap(x->dynamicElement(x, '%s'), arrayFilter(x->(dynamicType(x) = '%s'), %s))",
			plan.TerminalConfig.ElemType.ScalerType,
			plan.TerminalConfig.ElemType.ScalerType,
			baseArrayDynamicExpr)
	}()
	typedArrayExpr := func() string {
		return fmt.Sprintf("dynamicElement(%s, '%s')", arrayPath, typedArrayType.StringValue())
	}()

	// If both typed array and Array(Dynamic) are present, OR both membership checks
	if hasTypedArray && hasArrayDynamic {
		m1, err := b.buildArrayMembership(typedArrayExpr, operator, value, plan.TerminalConfig.ElemType, sb)
		if err != nil {
			return "", err
		}
		m2, err := b.buildArrayMembership(filteredDynamicExpr, operator, value, plan.TerminalConfig.ElemType, sb)
		if err != nil {
			return "", err
		}
		return sb.Or(m1, m2), nil
	}

	var arrayExpr string
	if hasTypedArray {
		// Use the typed array directly when available
		arrayExpr = typedArrayExpr
	} else {
		// Fall back to Array(Dynamic) with filtering
		arrayExpr = filteredDynamicExpr
	}

	// For array membership, use original value (not LIKE-wrapped)
	return b.buildArrayMembership(arrayExpr, operator, value, plan.TerminalConfig.ElemType, sb)
}

// recurseArrayHops recursively builds array traversal conditions
func (b *JSONQueryBuilder) recurseArrayHops(current *Node, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	if current == nil {
		return "", fmt.Errorf("navigation failed, current node is nil")
	}

	if current.IsTerminal {
		terminalCond, err := b.buildTerminalCondition(current, operator, value, sb)
		if err != nil {
			return "", err
		}
		return terminalCond, nil
	}

	currAlias := current.Alias()
	fieldPath := current.FieldPath()
	// Determine availability of Array(JSON) and Array(Dynamic) at this hop
	hasArrayJSON := current.Branches[BranchJSON] != nil
	hasArrayDynamic := current.Branches[BranchDynamic] != nil

	// Then, at this hop, compute child per branch and wrap
	branches := make([]string, 0, 2)
	if hasArrayJSON {
		jsonArrayExpr := fmt.Sprintf("dynamicElement(%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')", fieldPath, current.MaxDynamicTypes, current.MaxDynamicPaths)
		childGroupJSON, err := b.recurseArrayHops(current.Branches[BranchJSON], operator, value, sb)
		if err != nil {
			return "", err
		}
		branches = append(branches, fmt.Sprintf("arrayExists(%s-> %s, %s)", currAlias, childGroupJSON, jsonArrayExpr))
	}
	if hasArrayDynamic {
		dynBaseExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", fieldPath)
		dynFilteredExpr := fmt.Sprintf("arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)

		// Create the Query for Dynamic array
		childGroupDyn, err := b.recurseArrayHops(current.Branches[BranchDynamic], operator, value, sb)
		if err != nil {
			return "", err
		}
		branches = append(branches, fmt.Sprintf("arrayExists(%s-> %s, %s)", currAlias, childGroupDyn, dynFilteredExpr))
	}

	if len(branches) == 1 {
		return branches[0], nil
	}
	return fmt.Sprintf("(%s)", strings.Join(branches, " OR ")), nil
}

func (b *JSONQueryBuilder) buildArrayMembership(arrayExpr string, operator qbtypes.FilterOperator, value any, elemType telemetrytypes.JSONDataType, sb *sqlbuilder.SelectBuilder) (string, error) {
	var membership string
	if elemType == telemetrytypes.String {
		// For string arrays:
		// - Contains/NotContains mean element membership equality
		// - Like/ILike use substring match
		if isMembershipContains(operator) {
			membership = fmt.Sprintf("arrayExists(x -> x = %s, %s)", sb.Var(value), arrayExpr)
		} else if isMembershipLike(operator) {
			op, err := b.applyOperator(sb, "x", operator, value)
			if err != nil {
				return "", err
			}
			membership = fmt.Sprintf("arrayExists(x -> %s, %s)", op, arrayExpr)
		} else {
			membership = fmt.Sprintf("arrayExists(x -> x = %s, %s)", sb.Var(value), arrayExpr)
		}
	} else {
		// For non-string types, use exact equality
		membership = fmt.Sprintf("arrayExists(x -> x = %s, %s)", sb.Var(value), arrayExpr)
	}

	if b.isNotOperator(operator) {
		return fmt.Sprintf("NOT %s", membership), nil
	}

	return membership, nil
}

func (b *JSONQueryBuilder) isNotOperator(op qbtypes.FilterOperator) bool {
	return op == qbtypes.FilterOperatorNotContains || op == qbtypes.FilterOperatorNotLike || op == qbtypes.FilterOperatorNotILike
}

func (b *JSONQueryBuilder) applyOperator(sb *sqlbuilder.SelectBuilder, fieldExpr string, operator qbtypes.FilterOperator, value any) (string, error) {
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
func (b *JSONQueryBuilder) BuildGroupBy(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*GroupByArrayJoinInfo, error) {
	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)

	plan, err := PlanJSON(ctx, path, qbtypes.FilterOperatorExists, nil, b.IsPromoted(path), b.getTypeSet)
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
		if b.IsPromoted(path) {
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
	arrayConcatExpr, err := b.buildArrayConcat(plan)
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
func (b *JSONQueryBuilder) buildArrayConcat(plan []*Node) (string, error) {
	if len(plan) == 0 {
		return "", errors.Newf(errors.TypeInternal, CodeGroupByPlanEmpty, "group by plan is empty while building arrayConcat")
	}

	// Build arrayMap expressions for ALL available branches at the root level
	var arrayMapExpressions []string
	for _, node := range plan {
		hasJSON := node.Branches[BranchJSON] != nil
		hasDynamic := node.Branches[BranchDynamic] != nil

		if hasJSON {
			jsonExpr, err := b.buildArrayMap(node, BranchJSON)
			if err != nil {
				return "", err
			}
			arrayMapExpressions = append(arrayMapExpressions, jsonExpr)
		}

		if hasDynamic {
			dynamicExpr, err := b.buildArrayMap(node, BranchDynamic)
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
func (b *JSONQueryBuilder) buildArrayMap(currentNode *Node, branchType BranchType) (string, error) {
	if currentNode == nil {
		return "", errors.Newf(errors.TypeInternal, CodeCurrentNodeNil, "current node is nil while building arrayMap")
	}

	nextNode := currentNode.Branches[branchType]
	if nextNode == nil {
		return "", errors.Newf(errors.TypeInternal, CodeNextNodeNil, "next node is nil while building arrayMap")
	}

	// Build the array expression for this level
	var arrayExpr string
	if branchType == BranchJSON {
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
	hasJSON := nextNode.Branches[BranchJSON] != nil
	hasDynamic := nextNode.Branches[BranchDynamic] != nil

	if hasJSON {
		jsonNested, err := b.buildArrayMap(nextNode, BranchJSON)
		if err != nil {
			return "", err
		}
		nestedExpressions = append(nestedExpressions, jsonNested)
	}

	if hasDynamic {
		dynamicNested, err := b.buildArrayMap(nextNode, BranchDynamic)
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

func assumeNotNull(column string) string {
	return fmt.Sprintf("assumeNotNull(dynamicElement(%s, 'String'))", column)
}
