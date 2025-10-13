package telemetrylogs

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
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

// mapTypeStringToJSONDataType converts CH type strings persisted in metadata into JSONDataType
func mapTypeStringToJSONDataType(t string) telemetrytypes.JSONDataType {
	switch t {
	case "String":
		return telemetrytypes.String
	case "Int64":
		return telemetrytypes.Int64
	case "Float64":
		return telemetrytypes.Float64
	case "Bool":
		return telemetrytypes.Bool
	case "Array(Nullable(String))":
		return telemetrytypes.ArrayString
	case "Array(Nullable(Int64))":
		return telemetrytypes.ArrayInt64
	case "Array(Nullable(Float64))":
		return telemetrytypes.ArrayFloat64
	case "Array(Nullable(Bool))":
		return telemetrytypes.ArrayBool
	case "Array(JSON)", "Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))":
		return telemetrytypes.ArrayJSON
	case "Array(Dynamic)":
		return telemetrytypes.ArrayDynamic
	default:
		return telemetrytypes.Dynamic
	}
}

type JSONQueryBuilder struct {
	telemetryStore telemetrystore.TelemetryStore
	cache          sync.Map // map[string]*utils.ConcurrentSet[telemetrytypes.JSONDataType]
	lastSeen       uint64
}

func NewJSONQueryBuilder(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) (*JSONQueryBuilder, error) {
	metadata := &JSONQueryBuilder{telemetryStore: telemetryStore, cache: sync.Map{}}

	metadata.init()
	return metadata, metadata.sync(ctx, true)
}

func (b *JSONQueryBuilder) init() {
	// full load the metadata every hour
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			err := b.sync(context.Background(), true)
			if err != nil {
				// TODO: add logger
				fmt.Println("error full loading path metadata", err)
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			err := b.sync(context.Background(), false)
			if err != nil {
				// TODO: add logger
				fmt.Println("error fetching updates for path metadata", err)
			}
		}
	}()
}

func (b *JSONQueryBuilder) sync(ctx context.Context, fullLoad bool) error {
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

// Deterministic planning helpers (no explicit enum needed in current design)

func (b *JSONQueryBuilder) getTypeSet(path string) []telemetrytypes.JSONDataType {
	if cachedSet, exists := b.cache.Load(path); exists {
		if set, ok := cachedSet.(*utils.ConcurrentSet[telemetrytypes.JSONDataType]); ok && set.Len() > 0 {
			return set.ToSlice()
		}
	}
	return nil
}

// ValueKind normalizes runtime value/operator intent to a coarse type for planning

// presence summarizes what cache says exists at a terminal path
type presence struct {
	scalarString bool
	scalarInt    bool
	scalarFloat  bool
	scalarBool   bool

	arrayString bool
	arrayInt    bool
	arrayFloat  bool
	arrayBool   bool
}

func collectPresence(cached []telemetrytypes.JSONDataType) presence {
	p := presence{}
	for _, t := range cached {
		switch t {
		case telemetrytypes.String:
			p.scalarString = true
		case telemetrytypes.Int64:
			p.scalarInt = true
		case telemetrytypes.Float64:
			p.scalarFloat = true
		case telemetrytypes.Bool:
			p.scalarBool = true
		case telemetrytypes.ArrayString:
			p.arrayString = true
		case telemetrytypes.ArrayInt64:
			p.arrayInt = true
		case telemetrytypes.ArrayFloat64:
			p.arrayFloat = true
		case telemetrytypes.ArrayBool:
			p.arrayBool = true
		}
	}
	return p
}

// decideContains applies explicit priority rules for LIKE/Contains family
func decideContains(p presence, dataType telemetrytypes.JSONDataType) (preferArray bool, elem telemetrytypes.JSONDataType) {
	switch dataType {
	case telemetrytypes.String:
		if p.arrayString {
			return true, telemetrytypes.String
		}
		if p.scalarString {
			return false, telemetrytypes.String
		}
	case telemetrytypes.Int64:
		if p.arrayInt {
			return true, telemetrytypes.Int64
		}
		if p.scalarInt {
			return false, telemetrytypes.Int64
		}
	case telemetrytypes.Float64:
		if p.arrayFloat {
			return true, telemetrytypes.Float64
		}
		if p.scalarFloat {
			return false, telemetrytypes.Float64
		}
	case telemetrytypes.Bool:
		if p.arrayBool {
			return true, telemetrytypes.Bool
		}
		if p.scalarBool {
			return false, telemetrytypes.Bool
		}
	}
	// Fallbacks when explicit type presence is inconclusive
	// Prefer array-any if any array type for this path exists
	if p.arrayInt || p.arrayFloat || p.arrayBool || p.arrayString {
		return true, dataType
	}
	// Otherwise default to scalar of inferred type (safe fallback)
	return false, dataType
}

// decideOther applies priority rules for non-LIKE-family operators
func decideOther(p presence, dataType telemetrytypes.JSONDataType) (preferArray bool, elem telemetrytypes.JSONDataType) {
	switch dataType {
	case telemetrytypes.String:
		if p.scalarString {
			return false, telemetrytypes.String
		}
		if p.arrayString {
			return true, telemetrytypes.String
		}
	case telemetrytypes.Int64:
		if p.scalarInt {
			return false, telemetrytypes.Int64
		}
		if p.arrayInt {
			return true, telemetrytypes.Int64
		}
	case telemetrytypes.Float64:
		if p.scalarFloat {
			return false, telemetrytypes.Float64
		}
		if p.arrayFloat {
			return true, telemetrytypes.Float64
		}
	case telemetrytypes.Bool:
		if p.scalarBool {
			return false, telemetrytypes.Bool
		}
		if p.arrayBool {
			return true, telemetrytypes.Bool
		}
	}
	// Default to scalar unknown → string, which is safe
	return false, telemetrytypes.String
}
func (b *JSONQueryBuilder) chooseTerminalType(availableTypes []telemetrytypes.JSONDataType, operator qbtypes.FilterOperator, value any) telemetrytypes.JSONDataType {
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
func (b *JSONQueryBuilder) chooseArrayPreference(node *Node, operator qbtypes.FilterOperator, value any) (preferArray bool, elem telemetrytypes.JSONDataType) {
	cached := node.AvailableTypes
	if cached == nil {
		return false, telemetrytypes.String
	}
	p := collectPresence(cached)
	dataType, _ := b.inferDataType(value, operator)
	if isMembershipContains(operator) || isMembershipLike(operator) {
		return decideContains(p, dataType)
	}
	return decideOther(p, dataType)
}

// BuildCondition builds the full WHERE condition for body_v2 JSON paths
func (b *JSONQueryBuilder) BuildCondition(ctx context.Context, key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {

	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)
	// Normalize path: replace . with : after the first : to handle education:awards.name -> education:awards:name
	if strings.Contains(path, ":") {
		parts := strings.SplitN(path, ":", 2)
		if len(parts) == 2 {
			path = parts[0] + ":" + strings.ReplaceAll(parts[1], ".", ":")
		}
	}
	plan := b.PlanJSONPath(path, operator, value)
	return b.EmitPlannedCondition(plan, path, operator, value, sb)
}

// BuildJSONFieldExpression builds a dynamicElement expression for a JSON field (for SELECT/GroupBy)
func (b *JSONQueryBuilder) BuildJSONFieldExpression(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (string, error) {
	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)

	// Get all types for this path
	typeSet := b.getTypeSet(path)
	if len(typeSet) == 0 {
		return "", errors.Newf(errors.TypeNotFound, errors.CodeNotFound,
			"No valid types found for JSON path: %s", path)
	}

	// For SELECT expressions, prefer scalar types if available
	fieldPath := "body_v2." + path

	// Check for scalar types first
	scalarTypes := []string{}
	arrayTypes := []string{}

	for _, dataType := range typeSet {
		typeStr := dataType.StringValue()
		if strings.HasPrefix(typeStr, "Array(") {
			arrayTypes = append(arrayTypes, typeStr)
		} else {
			scalarTypes = append(scalarTypes, typeStr)
		}
	}

	if len(scalarTypes) > 0 {
		// Use the first scalar type for SELECT
		expression := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, scalarTypes[0])
		return expression, nil
	} else if len(arrayTypes) > 0 {
		// Use the first array type for SELECT
		expression := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, arrayTypes[0])
		return expression, nil
	}

	return "", errors.Newf(errors.TypeNotFound, errors.CodeNotFound,
		"No valid types found for JSON path: %s", path)
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
	PreferredType  telemetrytypes.JSONDataType

	// Precomputed aliases for this node
	Alias string

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

func (n *Node) FieldPath() string {
	return n.Parent.Alias + "." + n.Name
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
func (b *JSONQueryBuilder) PlanJSONPath(path string, operator qbtypes.FilterOperator, value any) *Node {
	parts := strings.Split(path, ":")
	return b.buildPlan(parts, 0, operator, value, &Node{
		Alias: "body_v2",
	}, false)
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
	if index == 0 {
		// Root node - use base values (16, 0)
		maxTypes = 16
		maxPaths = 0
	} else if isDynArrChild {
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
	alias := b.generateAlias(part)

	// Create node for this path segment
	node := &Node{
		Name:            part,
		Path:            pathSoFar,
		IsArray:         !isTerminal, // Only non-terminal parts are arrays
		IsTerminal:      isTerminal,
		Alias:           alias,
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

// configureTerminal sets up terminal node configuration
func (b *JSONQueryBuilder) configureTerminal(node *Node, operator qbtypes.FilterOperator, value any) {
	preferArray, elemType := b.chooseArrayPreference(node, operator, value)

	node.PreferredType = b.chooseTerminalType(node.AvailableTypes, operator, value)
	node.TerminalConfig = &TerminalConfig{
		PreferArrayAtEnd: preferArray,
		ElemType:         elemType,
		ValueType:        node.PreferredType,
		Operator:         operator,
		Value:            value,
	}
}

// generateAlias creates a sanitized alias for a path segment
func (b *JSONQueryBuilder) generateAlias(part string) string {
	sanitize := func(s string) string {
		var result strings.Builder
		for _, r := range s {
			if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
				result.WriteRune(r)
			} else {
				result.WriteByte('_')
			}
		}
		return result.String()
	}

	return "_x_" + sanitize(part)
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
		indentStr, p.Name, p.Path, p.Alias))

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

	// Simple path: no array hops (no colons in path)
	if !strings.Contains(fullPath, ":") {
		return b.emitSimpleCondition(plan, fullPath, operator, effVal, sb)
	}

	// Array traversal
	return b.emitArrayCondition(plan, operator, value, effVal, sb)
}

// emitSimpleCondition handles paths without array hops
func (b *JSONQueryBuilder) emitSimpleCondition(plan *Node, fullPath string, operator qbtypes.FilterOperator, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	base := "body_v2." + fullPath

	if plan.TerminalConfig != nil && plan.TerminalConfig.PreferArrayAtEnd {
		// Array membership check
		arrayExpr := fmt.Sprintf("dynamicElement(%s, '%s')", base, telemetrytypes.ScalerTypeToArrayType[plan.TerminalConfig.ElemType].StringValue())
		cond := b.buildArrayMembership(arrayExpr, operator, effVal, plan.TerminalConfig.ElemType, sb)
		sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, cond))
		return cond, nil
	}

	// Scalar field access
	elemType := plan.PreferredType
	if plan.TerminalConfig != nil {
		elemType = plan.TerminalConfig.ElemType
	}
	fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", base, elemType.StringValue())
	cond, err := b.applyOperator(sb, fieldExpr, operator, effVal)
	if err != nil {
		return "", err
	}
	sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, cond))
	return cond, nil
}

// emitArrayCondition handles paths with array traversal
func (b *JSONQueryBuilder) emitArrayCondition(plan *Node, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Build traversal + terminal recursively per-hop
	compiled, err := b.recurseArrayHopsState(plan, operator, value, effVal, sb)
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
	hasTypedArray := false
	for _, t := range cached {
		if t == typedArrayType {
			hasTypedArray = true
			break
		}
	}
	hasArrayDynamic := false
	for _, t := range cached {
		if t == telemetrytypes.ArrayDynamic {
			hasArrayDynamic = true
			break
		}
	}

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

// recurseArrayHopsState recursively builds array traversal conditions
func (b *JSONQueryBuilder) recurseArrayHopsState(current *Node, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
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

	currAlias := current.Alias
	parentAlias := current.Parent.Alias
	// Determine availability of Array(JSON) and Array(Dynamic) at this hop
	hasArrayJSON := current.Branches[BranchJSON] != nil
	hasArrayDynamic := current.Branches[BranchDynamic] != nil

	// Then, at this hop, compute child per branch and wrap
	branches := make([]string, 0, 2)
	if hasArrayJSON {
		jsonArrayExpr := fmt.Sprintf("dynamicElement(%s.%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')", parentAlias, current.Name, current.MaxDynamicTypes, current.MaxDynamicPaths)
		childGroupJSON, err := b.recurseArrayHopsState(current.Branches[BranchJSON], operator, value, effVal, sb)
		if err != nil {
			return "", err
		}
		branches = append(branches, fmt.Sprintf("arrayExists(%s-> %s, %s)", currAlias, childGroupJSON, jsonArrayExpr))
	}
	if hasArrayDynamic {
		dynBaseExpr := fmt.Sprintf("dynamicElement(%s.%s, 'Array(Dynamic)')", parentAlias, current.Name)
		dynFilteredExpr := fmt.Sprintf("arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)

		// Create the Query for Dynamic array
		childGroupDyn, err := b.recurseArrayHopsState(current.Branches[BranchDynamic], operator, value, effVal, sb)
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

// BuildGroupByArrayJoins builds array join information for GroupBy operations
func (b *JSONQueryBuilder) BuildGroupByArrayJoins(ctx context.Context, key *telemetrytypes.TelemetryFieldKey) (*GroupByArrayJoinInfo, error) {
	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)
	plan := b.PlanJSONPath(path, qbtypes.FilterOperatorExists, nil)

	// Build array join clauses by traversing the tree
	arrayJoinClauses := b.buildArrayJoinClausesFromTree(plan)

	// Build terminal field expression using the terminal node
	terminalNode := b.findTerminalNodeInTree(plan)
	if terminalNode == nil {
		return nil, errors.Newf(errors.TypeNotFound, errors.CodeNotFound,
			"Could not find terminal node for path: %s", path)
	}

	// Use the correct terminal type from the plan
	terminalExpr := b.buildTerminalExpressionFromNode(terminalNode)

	return &GroupByArrayJoinInfo{
		ArrayJoinClauses: arrayJoinClauses,
		TerminalExpr:     terminalExpr,
	}, nil
}

// buildArrayJoinClausesFromTree builds array join clauses by traversing the tree
func (b *JSONQueryBuilder) buildArrayJoinClausesFromTree(plan *Node) []string {
	var clauses []string
	current := plan
	parentAlias := "body_v2"

	for current != nil && !current.IsTerminal {
		// Check if this node has array types
		hasArrayJSON := current.Branches[BranchJSON] != nil
		hasArrayDynamic := current.Branches[BranchDynamic] != nil

		if hasArrayJSON || hasArrayDynamic {
			// Build array expression using the node's max_dynamic values
			var arrayExpr string
			if hasArrayJSON && hasArrayDynamic {
				// Both types available - use Array(JSON) for GroupBy (simpler)
				// Use the node's MaxDynamicTypes and MaxDynamicPaths values
				arrayExpr = fmt.Sprintf("dynamicElement(%s.%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')",
					parentAlias, current.Name, current.MaxDynamicTypes, current.MaxDynamicPaths)
			} else if hasArrayJSON {
				// Only Array(JSON) available - use the node's max_dynamic values
				arrayExpr = fmt.Sprintf("dynamicElement(%s.%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')",
					parentAlias, current.Name, current.MaxDynamicTypes, current.MaxDynamicPaths)
			} else {
				// Only Array(Dynamic) available - filter for JSON objects
				dynBaseExpr := fmt.Sprintf("dynamicElement(%s.%s, 'Array(Dynamic)')", parentAlias, current.Name)
				arrayExpr = fmt.Sprintf("arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)
			}

			clause := fmt.Sprintf("ARRAY JOIN %s AS %s", arrayExpr, current.Alias)
			clauses = append(clauses, clause)
			parentAlias = current.Alias
		}

		// Move to next level - prefer JSON branch for GroupBy
		if next, exists := current.Branches[BranchJSON]; exists {
			current = next
		} else if next, exists := current.Branches[BranchDynamic]; exists {
			current = next
		} else {
			break
		}
	}

	return clauses
}

// findTerminalNodeInTree finds the terminal node in the tree
func (b *JSONQueryBuilder) findTerminalNodeInTree(plan *Node) *Node {
	current := plan
	for current != nil && !current.IsTerminal {
		// Prefer JSON branch for GroupBy, fallback to Dynamic
		if next, exists := current.Branches[BranchJSON]; exists {
			current = next
		} else if next, exists := current.Branches[BranchDynamic]; exists {
			current = next
		} else {
			break
		}
	}
	return current
}

// buildTerminalExpressionFromNode builds a terminal expression using the node's type information
func (b *JSONQueryBuilder) buildTerminalExpressionFromNode(node *Node) string {
	if node == nil {
		return ""
	}

	// For GroupBy, we need to use the parent's alias and build the field path correctly
	// The working pattern shows: dynamicElement(_x_education.awards.name, 'String')
	// where _x_education is the parent alias and awards.name is the field path
	var fieldPath string
	if node.Parent != nil {
		// Use parent's alias and the field name
		fieldPath = fmt.Sprintf("%s.%s", node.Parent.Alias, node.Name)
	} else {
		// Fallback for root level fields
		fieldPath = fmt.Sprintf("%s.%s", node.Alias, node.Name)
	}

	// Use the PreferredType from the node, which is properly calculated by the plan system
	return fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, node.PreferredType.StringValue())
}
