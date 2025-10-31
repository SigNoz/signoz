package telemetrylogs

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
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
)

// Operator intent helpers
func isMembershipContains(op qbtypes.FilterOperator) bool {
	return op == qbtypes.FilterOperatorContains || op == qbtypes.FilterOperatorNotContains
}

func isMembershipLike(op qbtypes.FilterOperator) bool {
	return op == qbtypes.FilterOperatorLike || op == qbtypes.FilterOperatorILike || op == qbtypes.FilterOperatorNotLike
}

type PathType struct {
	Path     string `ch:"path"`
	Type     string `ch:"type"`
	LastSeen uint64 `ch:"last_seen"`
}

type JSONQueryBuilder struct {
	telemetryStore       telemetrystore.TelemetryStore
	cache                sync.Map // map[string]*utils.ConcurrentSet[telemetrytypes.JSONDataType]
	lastSeen             uint64
	promotedPaths        sync.Map     // map[string]struct{} of promoted JSON paths
	stringIndexedColumns atomic.Value // map[string]string of string indexed columns

	logger *slog.Logger
}

func NewJSONQueryBuilder(ctx context.Context,
	telemetryStore telemetrystore.TelemetryStore, logger *slog.Logger) (*JSONQueryBuilder, error) {
	metadata := &JSONQueryBuilder{telemetryStore: telemetryStore, cache: sync.Map{}}

	metadata.init()
	metadata.stringIndexedColumns.Store(make(map[string]string))

	// load promoted paths initially
	if err := metadata.syncPromoted(context.Background()); err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to load promoted paths")
	}

	return metadata, metadata.syncPathTypes(ctx, true)
}

func (b *JSONQueryBuilder) init() {
	// full load the metadata every hour
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			err := b.syncPathTypes(context.Background(), true)
			if err != nil {
				b.logger.Error("error full loading path metadata", slog.Any("error", err))
			}
		}
	}()

	// incremental sync every minute
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			err := b.syncPathTypes(context.Background(), false)
			if err != nil {
				b.logger.Error("error fetching updates for path metadata", slog.Any("error", err))
			}
		}
	}()

	// refresh promoted paths every minute
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			if err := b.syncPromoted(context.Background()); err != nil {
				b.logger.Error("error refreshing promoted paths", slog.Any("error", err))
			}
		}
	}()

	// sync string indexed columns every 30 minutes
	go func() {
		ticker := time.NewTicker(30 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if err := b.syncStringIndexedColumns(context.Background()); err != nil {
				b.logger.Error("error syncing string indexed columns", slog.Any("error", err))
			}
		}
	}()
}

func (b *JSONQueryBuilder) syncPathTypes(ctx context.Context, fullLoad bool) error {
	var lastSeen uint64
	if !fullLoad {
		lastSeen = b.lastSeen
	}

	// Use the shared function to extract body JSON keys
	// For full sync: limit=0 (no limit), for incremental sync: limit=10000 (reasonable limit)
	var limit int
	if fullLoad {
		limit = 0 // No limit for full sync
	} else {
		limit = 10000 // Reasonable limit for incremental sync
	}
	bodyJSONPaths, _, highestLastSeen, err := ExtractBodyPaths(ctx, b.telemetryStore, "", limit, lastSeen)
	if err != nil {
		return err
	}

	if len(bodyJSONPaths) == 0 {
		return nil
	}

	if fullLoad {
		b.cache = sync.Map{}
	}

	for path, types := range bodyJSONPaths {
		setTyped := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()

		set, loaded := b.cache.LoadOrStore(path, setTyped)
		if loaded {
			setTyped = set.(*utils.ConcurrentSet[telemetrytypes.JSONDataType])
		}
		types.Iter(func(dataType telemetrytypes.JSONDataType) bool {
			setTyped.Insert(dataType)
			return true
		})
	}

	// Update lastSeen to the highest last_seen from the results
	if highestLastSeen > 0 {
		b.lastSeen = highestLastSeen
	}
	return nil
}

func (b *JSONQueryBuilder) syncStringIndexedColumns(ctx context.Context) error {
	query := fmt.Sprintf(`SELECT type, expr FROM 
	clusterAllReplicas('%s' %s) 
	WHERE database = '%s' AND table = '%s' AND type = 'ngrambf_v1'
	AND (expr LIKE '%%body_v2.%%' OR expr LIKE '%%promoted.%%')`,
		b.telemetryStore.Cluster(), SkipIndexTableName, DBName, LogsV2LocalTableName)
	rows, err := b.telemetryStore.ClickhouseDB().Query(ctx, query)
	if err != nil {
		return errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to load string indexed columns")
	}
	defer rows.Close()

	next := make(map[string]string)
	for rows.Next() {
		var typ string
		var expr string
		if err := rows.Scan(&typ, &expr); err != nil {
			return errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan string indexed column")
		}
		subColumn, err := schemamigrator.UnfoldJSONSubColumnIndexExpr(expr)
		if err != nil {
			return errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, fmt.Sprintf("failed to unfold JSON sub column index expression for %s", expr))
		}
		next[subColumn] = expr
	}

	b.stringIndexedColumns.Store(next)
	return nil
}

func (b *JSONQueryBuilder) inferDataType(value any, operator qbtypes.FilterOperator) (telemetrytypes.JSONDataType, any) {
	// check if the value is a int, float, string, bool
	valueType := telemetrytypes.Dynamic
	switch v := value.(type) {
	case []any:
		// take the first element and infer the type
		if len(v) > 0 {
			valueType, _ = b.inferDataType(v[0], operator)
		}
		return valueType, v
	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
		valueType = telemetrytypes.Int64
	case float32:
		f := float64(v)
		if IsFloatActuallyInt(f) {
			valueType = telemetrytypes.Int64
			value = int64(f)
		} else {
			valueType = telemetrytypes.Float64
		}
	case float64:
		if IsFloatActuallyInt(v) {
			valueType = telemetrytypes.Int64
			value = int64(v)
		} else {
			valueType = telemetrytypes.Float64
		}
	case string:
		fieldDataType, parsedValue := parseStrValue(v, operator)
		valueType = telemetrytypes.MappingFieldDataTypeToJSONDataType[fieldDataType]
		value = parsedValue
	case bool:
		valueType = telemetrytypes.Bool
	}

	return valueType, value
}

// IsFloatActuallyInt checks if a float64 has an exact int64 representation
func IsFloatActuallyInt(f float64) bool {
	return float64(int64(f)) == f
}

func (b *JSONQueryBuilder) getTypeSet(path string) []telemetrytypes.JSONDataType {
	if cachedSet, exists := b.cache.Load(path); exists {
		if set, ok := cachedSet.(*utils.ConcurrentSet[telemetrytypes.JSONDataType]); ok && set.Len() > 0 {
			return set.ToSlice()
		}
	}
	return nil
}

// IsPromoted reports whether a JSON path is present in the promoted paths set.
func (b *JSONQueryBuilder) IsPromoted(path string) bool {
	firstLeafNode := strings.Split(path, ":")[0]
	_, ok := b.promotedPaths.Load(firstLeafNode)
	return ok
}

// syncPromoted refreshes the promoted paths from ClickHouse and reconciles the set.
func (b *JSONQueryBuilder) syncPromoted(ctx context.Context) error {
	query := fmt.Sprintf("SELECT path FROM %s.%s", DBName, PromotedPathsTableName)
	rows, err := b.telemetryStore.ClickhouseDB().Query(ctx, query)
	if err != nil {
		return errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to load promoted paths")
	}
	defer rows.Close()

	next := make(map[string]struct{})
	for rows.Next() {
		var path string
		if err := rows.Scan(&path); err != nil {
			return errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan promoted path")
		}
		next[path] = struct{}{}
	}

	// Delete stale
	b.promotedPaths.Range(func(k, _ any) bool {
		key, _ := k.(string)
		if _, ok := next[key]; !ok {
			b.promotedPaths.Delete(key)
		}
		return true
	})
	// Add new
	for k := range next {
		b.promotedPaths.Store(k, struct{}{})
	}
	return nil
}

func (b *JSONQueryBuilder) determineValueType(availableTypes []telemetrytypes.JSONDataType, operator qbtypes.FilterOperator, value any) telemetrytypes.JSONDataType {
	// For GroupBy operations (EXISTS operator with nil value), use the first available type
	if operator == qbtypes.FilterOperatorExists && value == nil {
		if len(availableTypes) > 0 {
			// For GroupBy, prefer scalar types over array types
			for _, t := range availableTypes {
				if !t.IsArray {
					return t
				}
			}
			// If no scalar types, use the first available type
			return availableTypes[0]
		}

		// Fallback to String if no types available
		return telemetrytypes.String
	}

	// For other operations, derive from input value/operator
	vt, _ := b.inferDataType(value, operator)
	return vt
}

func wrapLikeValueIfNeeded(operator qbtypes.FilterOperator, value any) any {
	switch operator {
	case qbtypes.FilterOperatorContains, qbtypes.FilterOperatorNotContains:
		return fmt.Sprintf("%%%v%%", value)
	default:
		return value
	}
}

// chooseArrayPreference decides whether to search scalar or array at the terminal
// and returns the preferred element type for the terminal comparison.
func (b *JSONQueryBuilder) decideElemType(node *Node, operator qbtypes.FilterOperator, valueType telemetrytypes.JSONDataType) (preferArray bool, elem telemetrytypes.JSONDataType) {
	available := node.AvailableTypes
	// Rule: if no available types, decision cannot be made → ElemType = ValueType, no array preference
	if len(available) == 0 {
		return false, valueType
	}

	// Check availability for scalars and scalar arrays matching valueType
	hasScalar := false
	hasArray := false
	switch valueType {
	case telemetrytypes.String:
		hasScalar = slices.Contains(available, telemetrytypes.String)
		hasArray = slices.Contains(available, telemetrytypes.ArrayString)
	case telemetrytypes.Int64:
		hasScalar = slices.Contains(available, telemetrytypes.Int64)
		hasArray = slices.Contains(available, telemetrytypes.ArrayInt64)
	case telemetrytypes.Float64:
		hasScalar = slices.Contains(available, telemetrytypes.Float64)
		hasArray = slices.Contains(available, telemetrytypes.ArrayFloat64)
	case telemetrytypes.Bool:
		hasScalar = slices.Contains(available, telemetrytypes.Bool)
		hasArray = slices.Contains(available, telemetrytypes.ArrayBool)
	default:
		// For Dynamic or anything else, treat as undecidable against scalar set
		return false, valueType
	}

	// Rule: With Contains/NotContains, PreferArrayAtEnd can only be true if matching typed array exists
	if isMembershipContains(operator) {
		if hasArray {
			return true, telemetrytypes.ScalerTypeToArrayType[valueType]
		}
		// No matching typed array → must not prefer array; fall back to scalar if present
		if hasScalar {
			return false, valueType
		}
		// Neither present → undecidable → ElemType = ValueType
		return false, valueType
	}

	// Rule: Universal logic for all operators
	// Prefer scalar when available; if only array exists, choose array; else fallback to ValueType
	if hasScalar {
		return false, valueType
	}
	if hasArray {
		return true, valueType
	}
	return false, valueType
}

// BuildCondition builds the full WHERE condition for body_v2 JSON paths
func (b *JSONQueryBuilder) BuildCondition(ctx context.Context, key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {

	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)
	plan := b.PlanJSONPath(path, operator, value)

	conditions := []string{}
	for _, plan := range plan {
		condition, err := b.EmitPlannedCondition(plan, path, operator, value, sb)
		if err != nil {
			return "", err
		}
		conditions = append(conditions, condition)
	}
	return sb.Or(conditions...), nil
}

// Node is now a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
type Node struct {
	// Node information
	Name       string
	Path       string
	IsArray    bool
	IsTerminal bool

	// Precomputed type information (single source of truth)
	AvailableTypes []telemetrytypes.JSONDataType

	// Array type branches (Array(JSON) vs Array(Dynamic))
	Branches map[BranchType]*Node

	// Terminal configuration
	TerminalConfig *TerminalConfig

	// Parent reference for traversal
	Parent *Node

	// JSON progression parameters (precomputed during planning)
	MaxDynamicTypes int
	MaxDynamicPaths int
}

func (n *Node) Alias() string {
	if n.Parent == nil {
		return fmt.Sprintf("`%s`", n.Name)
	}

	return fmt.Sprintf("`%s:%s`",
		strings.TrimRight(strings.TrimLeft(n.Parent.Alias(), "`"), "`"),
		n.Name)
}

func (n *Node) FieldPath() string {
	return n.Parent.Alias() + "." + n.Name
}

type BranchType string

const (
	BranchJSON    BranchType = "json"
	BranchDynamic BranchType = "dynamic"
)

type TerminalConfig struct {
	PreferArrayAtEnd bool
	ElemType         telemetrytypes.JSONDataType
	ValueType        telemetrytypes.JSONDataType
	Operator         qbtypes.FilterOperator
	Value            any
}

// PlanJSONPath builds a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
func (b *JSONQueryBuilder) PlanJSONPath(path string, operator qbtypes.FilterOperator, value any) []*Node {
	// TODO: PlanJSONPath requires the Start and End of the Query to select correct column between promoted and body_v2 using
	// creation time in distributed_promoted_paths

	parts := strings.Split(path, ":")
	plans := []*Node{
		b.buildPlan(parts, 0, operator, value, &Node{
			Name:            "body_v2",
			MaxDynamicTypes: 32,
			MaxDynamicPaths: 0,
		}, false),
	}

	if b.IsPromoted(path) {
		plans = append(plans, b.buildPlan(parts, 0, operator, value, &Node{
			Name:            "promoted",
			MaxDynamicTypes: 32,
			MaxDynamicPaths: 1024,
		}, true))
	}

	return plans
}

// buildPlan recursively builds the path plan tree
func (b *JSONQueryBuilder) buildPlan(parts []string, index int, operator qbtypes.FilterOperator, value any, parent *Node, isDynArrChild bool) *Node {
	if index >= len(parts) {
		return nil
	}

	part := parts[index]
	pathSoFar := strings.Join(parts[:index+1], ":")
	isTerminal := index == len(parts)-1

	// Calculate progression parameters based on parent's values
	var maxTypes, maxPaths int
	if isDynArrChild {
		// Child of Dynamic array - reset progression to base values (16, 256)
		// This happens when we switch from Array(Dynamic) to Array(JSON)
		maxTypes = 16
		maxPaths = 256
	} else if parent != nil {
		// Child of JSON array - use parent's progression divided by 2 and 4
		maxTypes = parent.MaxDynamicTypes / 2
		maxPaths = parent.MaxDynamicPaths / 4
		if maxTypes < 0 {
			maxTypes = 0
		}
		if maxPaths < 0 {
			maxPaths = 0
		}
	}

	// Create alias for this node
	// alias := b.generateAlias(part)

	// Create node for this path segment
	node := &Node{
		Name:       part,
		Path:       pathSoFar,
		IsArray:    !isTerminal, // Only non-terminal parts are arrays
		IsTerminal: isTerminal,
		// Alias:           pathSoFar,
		AvailableTypes:  b.getTypeSet(pathSoFar),
		Branches:        make(map[BranchType]*Node),
		Parent:          parent,
		MaxDynamicTypes: maxTypes,
		MaxDynamicPaths: maxPaths,
	}

	hasJSON := slices.Contains(node.AvailableTypes, telemetrytypes.ArrayJSON)
	hasDynamic := slices.Contains(node.AvailableTypes, telemetrytypes.ArrayDynamic)

	// Configure terminal if this is the last part
	if isTerminal {
		b.configureTerminal(node, operator, value)
	} else {
		if hasJSON {
			node.Branches[BranchJSON] = b.buildPlan(parts, index+1, operator, value, node, false)
		}
		if hasDynamic {
			node.Branches[BranchDynamic] = b.buildPlan(parts, index+1, operator, value, node, true)
		}
	}

	return node
}

// Rule 1: valueType is determined based on the Value
// Rule 1.1: if Value is nil (incase of EXISTS/NOT EXISTS + GroupBy) then on Operator and AvailableTypes
// Rule 2: decision cannot be made if no type available; set ElemType = ValueType
// Rule 3: elemType is determined based on the Operator, ValueType and the AvailableTypes all three in consideration
// Rule 4: PreferArrayAtEnd can never be true if Scaler Arrays with matching type with ValueType aren't available with Contains operator
// configureTerminal sets up terminal node configuration
func (b *JSONQueryBuilder) configureTerminal(node *Node, operator qbtypes.FilterOperator, value any) {
	// ValueType: inference for normal operators; for EXISTS/group-by pick from availability (rule 5)
	valueType := b.determineValueType(node.AvailableTypes, operator, value)

	// ElemType: decision based only on scalar and scalar arrays + operator + ValueType (rules 1,3,4,6)
	preferArray, elemType := b.decideElemType(node, operator, valueType)

	// Rule: if decision couldn't be made, ElemType equals ValueType handled inside chooser
	node.TerminalConfig = &TerminalConfig{
		PreferArrayAtEnd: preferArray,
		ElemType:         elemType,
		ValueType:        valueType,
		Operator:         operator,
		Value:            value,
	}
}

// String returns a visual representation of the tree structure
func (p *Node) String() string {
	return p.printTree(0)
}

func (p *Node) printTree(indent int) string {
	var sb strings.Builder

	// Print current node
	indentStr := strings.Repeat("  ", indent)
	sb.WriteString(fmt.Sprintf("%s%s (path: %s, alias: %s)\n",
		indentStr, p.Name, p.Path, p.Alias()))

	// Print type information
	if len(p.AvailableTypes) > 0 {
		typeStrs := make([]string, len(p.AvailableTypes))
		for i, t := range p.AvailableTypes {
			typeStrs[i] = t.StringValue()
		}
		sb.WriteString(fmt.Sprintf("%s  types: [%s]\n",
			indentStr, strings.Join(typeStrs, ", ")))
	}

	// Print terminal configuration
	if p.IsTerminal && p.TerminalConfig != nil {
		sb.WriteString(fmt.Sprintf("%s  terminal: preferArray=%v, elemType=%s, valueType=%s\n",
			indentStr, p.TerminalConfig.PreferArrayAtEnd,
			p.TerminalConfig.ElemType.StringValue(),
			p.TerminalConfig.ValueType.StringValue()))
	}

	// Print branches
	for branchType, branch := range p.Branches {
		if branch != nil {
			sb.WriteString(fmt.Sprintf("%s  branch[%s]:\n", indentStr, branchType))
			sb.WriteString(branch.printTree(indent + 2))
		}
	}

	return sb.String()
}

// EmitPlannedCondition materializes the SQL WHERE clause from a Node tree.
func (b *JSONQueryBuilder) EmitPlannedCondition(plan *Node, fullPath string, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	effVal := wrapLikeValueIfNeeded(operator, value)

	// plan traversal
	return b.emitPlannedCondition(plan, operator, value, effVal, sb)
}

// emitPlannedCondition handles paths with array traversal
func (b *JSONQueryBuilder) emitPlannedCondition(plan *Node, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Build traversal + terminal recursively per-hop
	compiled, err := b.recurseArrayHops(plan, operator, value, effVal, sb)
	if err != nil {
		return "", err
	}

	sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, compiled))
	return compiled, nil
}

// buildTerminalCondition creates the innermost condition
func (b *JSONQueryBuilder) buildTerminalCondition(node *Node, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Use the parent's alias + current field name for the full path
	fieldPath := node.FieldPath()

	switch operator {
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		return b.applyOperator(sb, fieldPath, operator, value)

	case qbtypes.FilterOperatorContains, qbtypes.FilterOperatorNotContains, qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike, qbtypes.FilterOperatorNotLike:
		if node.TerminalConfig.PreferArrayAtEnd {
			return b.buildArrayMembershipCondition(node, operator, value, effVal, sb)
		}
		elemType := node.TerminalConfig.ElemType
		fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, elemType.StringValue())
		return b.applyOperator(sb, fieldExpr, operator, effVal)
	default:
		valueType := node.TerminalConfig.ValueType
		fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, valueType.StringValue())
		return b.applyOperator(sb, fieldExpr, operator, effVal)
	}
}

// buildArrayMembershipCondition handles array membership checks
func (b *JSONQueryBuilder) buildArrayMembershipCondition(plan *Node, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	arrayPath := plan.FieldPath()

	// Check if we should use Array(Dynamic) filtering or typed array
	cached := plan.AvailableTypes

	// Check if we have a typed array available for this element type
	typedArrayType := telemetrytypes.ScalerTypeToArrayType[plan.TerminalConfig.ElemType]
	hasTypedArray := slices.Contains(cached, typedArrayType)
	hasArrayDynamic := slices.Contains(cached, telemetrytypes.ArrayDynamic)

	// If both typed array and Array(Dynamic) are present, OR both membership checks
	if hasTypedArray && hasArrayDynamic {
		typedArrayExpr := fmt.Sprintf("dynamicElement(%s, '%s')", arrayPath, typedArrayType.StringValue())
		baseArrayDynamicExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", arrayPath)
		filteredDynamicExpr := fmt.Sprintf("arrayMap(x->dynamicElement(x, '%s'), arrayFilter(x->(dynamicType(x) = '%s'), %s))",
			plan.TerminalConfig.ElemType.StringValue(),
			plan.TerminalConfig.ElemType.StringValue(),
			baseArrayDynamicExpr)

		m1 := b.buildArrayMembership(typedArrayExpr, operator, value, plan.TerminalConfig.ElemType, sb)
		m2 := b.buildArrayMembership(filteredDynamicExpr, operator, value, plan.TerminalConfig.ElemType, sb)
		return sb.Or(m1, m2), nil
	}

	var arrayExpr string
	if hasTypedArray {
		// Use the typed array directly when available
		arrayExpr = fmt.Sprintf("dynamicElement(%s, '%s')", arrayPath, typedArrayType.StringValue())
	} else {
		// Fall back to Array(Dynamic) with filtering
		baseArrayExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", arrayPath)
		arrayExpr = fmt.Sprintf("arrayMap(x->dynamicElement(x, '%s'), arrayFilter(x->(dynamicType(x) = '%s'), %s))",
			plan.TerminalConfig.ElemType.StringValue(),
			plan.TerminalConfig.ElemType.StringValue(),
			baseArrayExpr)
	}

	// For array membership, use original value (not LIKE-wrapped)
	return b.buildArrayMembership(arrayExpr, operator, value, plan.TerminalConfig.ElemType, sb), nil
}

// recurseArrayHops recursively builds array traversal conditions
func (b *JSONQueryBuilder) recurseArrayHops(current *Node, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	if current == nil {
		return "", fmt.Errorf("navigation failed, current node is nil")
	}

	if current.IsTerminal {
		terminalCond, err := b.buildTerminalCondition(current, operator, value, effVal, sb)
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
		childGroupJSON, err := b.recurseArrayHops(current.Branches[BranchJSON], operator, value, effVal, sb)
		if err != nil {
			return "", err
		}
		branches = append(branches, fmt.Sprintf("arrayExists(%s-> %s, %s)", currAlias, childGroupJSON, jsonArrayExpr))
	}
	if hasArrayDynamic {
		dynBaseExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", fieldPath)
		dynFilteredExpr := fmt.Sprintf("arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)

		// Create the Query for Dynamic array
		childGroupDyn, err := b.recurseArrayHops(current.Branches[BranchDynamic], operator, value, effVal, sb)
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

func (b *JSONQueryBuilder) buildArrayMembership(arrayExpr string, operator qbtypes.FilterOperator, value any, elemType telemetrytypes.JSONDataType, sb *sqlbuilder.SelectBuilder) string {
	var membership string
	if elemType == telemetrytypes.String {
		// For string arrays:
		// - Contains/NotContains mean element membership equality
		// - Like/ILike use substring match
		if isMembershipContains(operator) {
			membership = fmt.Sprintf("arrayExists(x -> x = %s, %s)", sb.Var(value), arrayExpr)
		} else if isMembershipLike(operator) {
			likeVal := wrapLikeValueIfNeeded(operator, value)
			// TODO: applyOperator should be used here; this is way too hardcoded
			membership = fmt.Sprintf("arrayExists(x -> %s, %s)", sb.Var(likeVal), arrayExpr)
		} else {
			membership = fmt.Sprintf("arrayExists(x -> x = %s, %s)", sb.Var(value), arrayExpr)
		}
	} else {
		// For non-string types, use exact equality
		membership = fmt.Sprintf("arrayExists(x -> x = %s, %s)", sb.Var(value), arrayExpr)
	}

	if b.isNotOperator(operator) {
		return fmt.Sprintf("NOT %s", membership)
	}
	return membership
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

	plan := b.PlanJSONPath(path, qbtypes.FilterOperatorExists, nil)
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

			// promoted column first then body_v2 column
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
