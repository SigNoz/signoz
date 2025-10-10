package telemetrylogs

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz-otel-collector/utils"
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

type BodyConditionBuilder struct {
	telemetryStore telemetrystore.TelemetryStore
	cache          sync.Map // map[string]*utils.ConcurrentSet[telemetrytypes.JSONDataType]
	lastSeen       uint64
}

func NewBodyConditionBuilder(ctx context.Context, telemetryStore telemetrystore.TelemetryStore) (*BodyConditionBuilder, error) {
	metadata := &BodyConditionBuilder{telemetryStore: telemetryStore, cache: sync.Map{}}

	metadata.init()
	return metadata, metadata.sync(ctx, true)
}

func (b *BodyConditionBuilder) init() {
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

func (b *BodyConditionBuilder) sync(ctx context.Context, fullLoad bool) error {
	query := fmt.Sprintf("SELECT * FROM %s.%s FINAL ORDER BY last_seen DESC", DBName, PathTypesTableName)
	if !fullLoad {
		query = fmt.Sprintf("SELECT * FROM %s.%s WHERE last_seen > %d ORDER BY last_seen DESC", DBName, PathTypesTableName, b.lastSeen)
	}

	paths := []PathType{}
	err := b.telemetryStore.ClickhouseDB().Select(ctx, &paths, query)
	if err != nil {
		return err
	}

	if len(paths) == 0 {
		return nil
	}

	if fullLoad {
		b.cache = sync.Map{}
	}

	for _, path := range paths {
		setTyped := utils.NewConcurrentSet[telemetrytypes.JSONDataType]()

		set, loaded := b.cache.LoadOrStore(path.Path, setTyped)
		if loaded {
			setTyped = set.(*utils.ConcurrentSet[telemetrytypes.JSONDataType])
		}
		setTyped.Insert(mapTypeStringToJSONDataType(path.Type))
	}

	b.lastSeen = paths[0].LastSeen
	return nil
}

func (b *BodyConditionBuilder) inferDataType(value any, operator qbtypes.FilterOperator) (telemetrytypes.JSONDataType, any) {
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

func (b *BodyConditionBuilder) getTypeSet(path string) []telemetrytypes.JSONDataType {
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
func (b *BodyConditionBuilder) chooseTerminalType(_ []telemetrytypes.JSONDataType, operator qbtypes.FilterOperator, value any) telemetrytypes.JSONDataType {
	// Always derive from input value/operator. Fallbacks use inferred datatype only.
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
func (b *BodyConditionBuilder) chooseArrayPreference(path string, operator qbtypes.FilterOperator, value any, _ bool) (preferArray bool, elem telemetrytypes.JSONDataType) {
	cached := b.getTypeSet(path)
	p := collectPresence(cached)
	dataType, _ := b.inferDataType(value, operator)
	if isMembershipContains(operator) || isMembershipLike(operator) {
		return decideContains(p, dataType)
	}
	return decideOther(p, dataType)
}

// BuildCondition builds the full WHERE condition for body_v2 JSON paths
func (b *BodyConditionBuilder) BuildCondition(ctx context.Context, key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {

	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)
	plan := b.planJSONPath(path, operator, value)
	return b.emitPlannedCondition(plan, path, operator, value, sb)
}

// PathPlan captures a normalized traversal and terminal strategy for a body_v2 JSON path.
// It decouples planning (arrays vs fields, terminal preferences) from SQL emission.
type PathPlan struct {
	HasArrays      bool
	OuterArray     string
	TailFieldSegs  []string
	TraversalSteps []planStep

	PreferArrayAtEnd    bool
	TerminalElemType    telemetrytypes.JSONDataType // element type for array membership or LIKE scalar
	TerminalValueType   telemetrytypes.JSONDataType // scalar coercion type for non-LIKE ops
	FullPathForMetadata string                      // full path for metadata lookup (e.g., "education:parameters")
}

type planStep struct {
	isArr bool
	Name  string
}

// branchState captures traversal context affecting JSON flavor selection
type branchState struct {
	cameFromDynamic bool // true if the immediate parent branch was Dynamic
	jsonTypes       int  // active max_dynamic_types seed (>0 means in Dynamic→JSON subtree)
	jsonPaths       int  // active max_dynamic_paths seed
}

func (s branchState) nextForJSON() branchState {
	// If we just switched from Dynamic to JSON, seeds are set by caller.
	// For pure JSON→JSON, divide by progression factors when seeds are active.
	if s.jsonTypes > 0 {
		return branchState{cameFromDynamic: false, jsonTypes: s.jsonTypes / 2, jsonPaths: s.jsonPaths / 4}
	}
	return branchState{cameFromDynamic: false, jsonTypes: 0, jsonPaths: 0}
}

func (s branchState) seedOnDynamicToJSON() branchState {
	return branchState{cameFromDynamic: false, jsonTypes: 16, jsonPaths: 256}
}

func (s branchState) forDynamicChild() branchState {
	// Entering Dynamic branch resets; next JSON hop will seed
	return branchState{cameFromDynamic: true, jsonTypes: 0, jsonPaths: 0}
}

func (s branchState) jsonArrayExpr(parentAlias, field string, depth int) string {
	if s.jsonTypes > 0 {
		return fmt.Sprintf("dynamicElement(%s.%s, 'Array(JSON(max_dynamic_types=%d, max_dynamic_paths=%d))')", parentAlias, field, s.jsonTypes, s.jsonPaths)
	}
	jsonFlavor := telemetrytypes.NestedLevelArrayJSON(depth, true)
	return fmt.Sprintf("dynamicElement(%s.%s, '%s')", parentAlias, field, jsonFlavor.StringValue())
}

// planJSONPath parses the JSON path and decides the traversal steps and terminal comparison strategy
// using metadata cache and the operator/value. No SQL is generated here.
func (b *BodyConditionBuilder) planJSONPath(path string, operator qbtypes.FilterOperator, value any) PathPlan {
	plan := PathPlan{}
	plan.HasArrays = strings.Contains(path, ":")
	if !plan.HasArrays {
		plan.FullPathForMetadata = path
		plan.PreferArrayAtEnd, plan.TerminalElemType = b.chooseArrayPreference(path, operator, value, false)
		plan.TerminalValueType = b.chooseTerminalType(b.getTypeSet(path), operator, value)
		return plan
	}
	parts := strings.Split(path, ":")
	plan.OuterArray = parts[0]

	// Build traversal steps: treat intermediate colon tokens as array hops.
	steps := make([]planStep, 0)
	if len(parts) > 2 {
		for i := 1; i < len(parts)-1; i++ {
			token := parts[i]
			if token == "" {
				continue
			}
			steps = append(steps, planStep{isArr: true, Name: token})
		}
	}

	// Determine how to treat the last token: array vs field(s)
	lastToken := parts[len(parts)-1]
	if lastToken != "" {
		// If last token contains a dot, split into first as potential array hop and remainder fields
		if strings.Contains(lastToken, ".") {
			segs := strings.Split(lastToken, ".")
			// First seg might be an array hop (e.g., awards.name)
			steps = append(steps, planStep{isArr: true, Name: segs[0]})
			if len(segs) > 1 {
				plan.TailFieldSegs = segs[1:]
			}
		} else {
			// Decide using cache whether last token is array at terminal
			fullPathKey := strings.Join(parts, ":")
			cached := b.getTypeSet(fullPathKey)
			isArrayTerminal := false
			for _, t := range cached {
				if t.IsArray {
					isArrayTerminal = true
					break
				}
			}
			if isArrayTerminal {
				steps = append(steps, planStep{isArr: true, Name: lastToken})
			} else {
				plan.TailFieldSegs = []string{lastToken}
			}
		}
	}

	plan.TraversalSteps = steps

	// The fullPath for terminal typing preference is the joined key (outer + tokens)
	fullPath := strings.Join(parts, ":")
	plan.FullPathForMetadata = fullPath
	plan.PreferArrayAtEnd, plan.TerminalElemType = b.chooseArrayPreference(fullPath, operator, value, true)
	plan.TerminalValueType = b.chooseTerminalType(b.getTypeSet(fullPath), operator, value)
	return plan
}

// emitPlannedCondition materializes the SQL WHERE clause from a PathPlan.
func (b *BodyConditionBuilder) emitPlannedCondition(plan PathPlan, fullPath string, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, error) {
	effVal := wrapLikeValueIfNeeded(operator, value)

	// Simple path: no array hops
	if !plan.HasArrays {
		return b.emitSimpleCondition(plan, fullPath, operator, effVal, sb)
	}

	// Array traversal
	return b.emitArrayCondition(plan, fullPath, operator, value, effVal, sb)
}

// emitSimpleCondition handles paths without array hops
func (b *BodyConditionBuilder) emitSimpleCondition(plan PathPlan, fullPath string, operator qbtypes.FilterOperator, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	base := "body_v2." + fullPath

	if plan.PreferArrayAtEnd {
		// Array membership check
		arrayExpr := fmt.Sprintf("dynamicElement(%s, '%s')", base, telemetrytypes.ScalerTypeToArrayType[plan.TerminalElemType].StringValue())
		cond := b.buildArrayMembership(arrayExpr, operator, effVal, plan.TerminalElemType, sb)
		sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, cond))
		return cond, nil
	}

	// Scalar field access
	fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", base, plan.TerminalElemType.StringValue())
	cond, err := b.applyOperator(sb, fieldExpr, operator, effVal)
	if err != nil {
		return "", err
	}
	sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, cond))
	return cond, nil
}

// emitArrayCondition handles paths with array traversal
func (b *BodyConditionBuilder) emitArrayCondition(plan PathPlan, fullPath string, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Build array aliases
	aliases := b.buildArrayAliases(plan)

	// Build traversal + terminal recursively per-hop
	compiled, err := b.recurseArrayHops(plan, aliases, 0, operator, value, effVal, sb)
	if err != nil {
		return "", err
	}

	// Add to query - outermost array gets depth 1
	outermostFlavor := telemetrytypes.NestedLevelArrayJSON(1, true)
	sourceExpr := fmt.Sprintf("dynamicElement(body_v2.%s, '%s')", plan.OuterArray, outermostFlavor.StringValue())
	finalCond := fmt.Sprintf("arrayExists(%s-> %s, %s)", aliases[0], compiled, sourceExpr)
	sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, finalCond))
	return finalCond, nil
}

// buildArrayAliases creates _x_ prefixed aliases for array variables
func (b *BodyConditionBuilder) buildArrayAliases(plan PathPlan) []string {
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

	aliases := []string{"_x_" + sanitize(plan.OuterArray)}
	for _, step := range plan.TraversalSteps {
		if step.isArr {
			aliases = append(aliases, "_x_"+sanitize(step.Name))
		}
	}
	return aliases
}

// buildTerminalCondition creates the innermost condition
func (b *BodyConditionBuilder) buildTerminalCondition(plan PathPlan, aliases []string, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	terminalAlias := aliases[len(aliases)-1]
	fieldPath := b.buildFieldPath(terminalAlias, plan.TailFieldSegs)

	switch operator {
	case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
		return b.applyOperator(sb, fieldPath, operator, value)

	case qbtypes.FilterOperatorContains, qbtypes.FilterOperatorNotContains, qbtypes.FilterOperatorLike, qbtypes.FilterOperatorILike, qbtypes.FilterOperatorNotLike:
		if plan.PreferArrayAtEnd {
			return b.buildArrayMembershipCondition(plan, aliases, operator, value, effVal, sb)
		}
		return b.buildScalarCondition(plan, aliases, operator, value, effVal, sb)

	default:
		fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, plan.TerminalValueType.StringValue())
		return b.applyOperator(sb, fieldExpr, operator, effVal)
	}
}

// buildArrayMembershipCondition handles array membership checks
func (b *BodyConditionBuilder) buildArrayMembershipCondition(plan PathPlan, aliases []string, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	// Build array expression
	arrayPath := b.buildArrayPath(plan, aliases)

	// Check if we should use Array(Dynamic) filtering or typed array
	cached := b.getTypeSet(plan.FullPathForMetadata)

	// Check if we have a typed array available for this element type
	typedArrayType := telemetrytypes.ScalerTypeToArrayType[plan.TerminalElemType]
	hasTypedArray := slices.Contains(cached, typedArrayType)
	hasArrayDynamic := slices.Contains(cached, telemetrytypes.ArrayDynamic)

	// If both typed array and Array(Dynamic) are present, OR both membership checks
	if hasTypedArray && hasArrayDynamic {
		typedArrayExpr := fmt.Sprintf("dynamicElement(%s, '%s')", arrayPath, typedArrayType.StringValue())
		baseArrayDynamicExpr := fmt.Sprintf("dynamicElement(%s, 'Array(Dynamic)')", arrayPath)
		filteredDynamicExpr := fmt.Sprintf("arrayMap(x->dynamicElement(x, '%s'), arrayFilter(x->(dynamicType(x) = '%s'), %s))",
			plan.TerminalElemType.StringValue(),
			plan.TerminalElemType.StringValue(),
			baseArrayDynamicExpr)

		m1 := b.buildArrayMembership(typedArrayExpr, operator, value, plan.TerminalElemType, sb)
		m2 := b.buildArrayMembership(filteredDynamicExpr, operator, value, plan.TerminalElemType, sb)
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
			plan.TerminalElemType.StringValue(),
			plan.TerminalElemType.StringValue(),
			baseArrayExpr)
	}

	// For array membership, use original value (not LIKE-wrapped)
	return b.buildArrayMembership(arrayExpr, operator, value, plan.TerminalElemType, sb), nil
}

// buildScalarCondition handles scalar field access within arrays
func (b *BodyConditionBuilder) buildScalarCondition(plan PathPlan, aliases []string, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	terminalAlias := aliases[len(aliases)-1]
	fieldPath := b.buildFieldPath(terminalAlias, plan.TailFieldSegs)
	fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, plan.TerminalElemType.StringValue())

	// Special case for string LIKE operators in top-level arrays
	if plan.TerminalElemType == telemetrytypes.String && b.isLikeOperator(operator) && len(aliases) == 1 {
		likeExpr := sb.Like(fieldExpr, effVal)
		if b.isNotLikeOperator(operator) {
			likeExpr = sb.NotLike(fieldExpr, effVal)
		}
		return fmt.Sprintf("arrayExists(x -> x = %s, %s)", sb.Var(value), likeExpr), nil
	}

	return b.applyOperator(sb, fieldExpr, operator, effVal)
}

// recurseArrayHopsForward recursively wraps child conditions from hop index 0 forward, branching per-hop
func (b *BodyConditionBuilder) recurseArrayHops(plan PathPlan, aliases []string, idx int, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder) (string, error) {
	return b.recurseArrayHopsState(plan, aliases, idx, operator, value, effVal, sb, branchState{})
}

// recurseArrayHopsState carries branching state: whether parent selection was Dynamic,
// and the current JSON progression parameters (types, paths) when inside a Dynamic→JSON subtree.
func (b *BodyConditionBuilder) recurseArrayHopsState(plan PathPlan, aliases []string, idx int, operator qbtypes.FilterOperator, value, effVal any, sb *sqlbuilder.SelectBuilder, st branchState) (string, error) {
	// Compute the last hop to wrap (skip terminal hop if already handled by PreferArrayAtEnd)
	lastHopIdx := len(plan.TraversalSteps) - 1
	if plan.PreferArrayAtEnd {
		lastHopIdx--
	}

	// Base case: past the last hop to wrap → build terminal at the leaf
	if idx > lastHopIdx {
		terminalCond, err := b.buildTerminalCondition(plan, aliases, operator, value, effVal, sb)
		if err != nil {
			return "", err
		}
		return terminalCond, nil
	}

	step := plan.TraversalSteps[idx]
	if !step.isArr {
		return b.recurseArrayHopsState(plan, aliases, idx+1, operator, value, effVal, sb, st)
	}

	currAlias := aliases[idx+1]
	parentAlias := aliases[idx]

	// Build the path key up to this hop for metadata lookup: outer:step1:...:current
	pathParts := make([]string, 0, idx+2)
	pathParts = append(pathParts, plan.OuterArray)
	for j := 0; j <= idx; j++ {
		pathParts = append(pathParts, plan.TraversalSteps[j].Name)
	}
	pathKey := strings.Join(pathParts, ":")

	// Determine availability of Array(JSON) and Array(Dynamic) at this hop
	typeSet := b.getTypeSet(pathKey)
	hasArrayJSON := slices.Contains(typeSet, telemetrytypes.ArrayJSON)
	hasArrayDynamic := slices.Contains(typeSet, telemetrytypes.ArrayDynamic)

	// Build expressions for available array types at this hop
	depth := idx + 2 // first hop from outer array is depth 2
	// Determine current JSON state (seed now if switching Dynamic → JSON at this hop)
	currentState := st
	if st.cameFromDynamic && st.jsonTypes == 0 {
		currentState = st.seedOnDynamicToJSON()
	}
	jsonArrayExpr := currentState.jsonArrayExpr(parentAlias, step.Name, depth)

	dynBaseExpr := fmt.Sprintf("dynamicElement(%s.%s, 'Array(Dynamic)')", parentAlias, step.Name)
	dynFilteredExpr := fmt.Sprintf("arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", dynBaseExpr)

	// Then, at this hop, compute child per branch and wrap
	branches := make([]string, 0, 2)
	if hasArrayJSON {
		// For JSON branch, advance JSON progression for children from current state
		nextState := currentState.nextForJSON()
		childGroupJSON, err := b.recurseArrayHopsState(plan, aliases, idx+1, operator, value, effVal, sb, nextState)
		if err != nil {
			return "", err
		}
		branches = append(branches, fmt.Sprintf("arrayExists(%s-> %s, %s)", currAlias, childGroupJSON, jsonArrayExpr))
	}
	if hasArrayDynamic || (!hasArrayJSON && !hasArrayDynamic) {
		// Dynamic branch; children will see parentWasDynamic=true and reset JSON progression
		childGroupDyn, err := b.recurseArrayHopsState(plan, aliases, idx+1, operator, value, effVal, sb, st.forDynamicChild())
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

// Helper functions
func (b *BodyConditionBuilder) buildFieldPath(alias string, fieldSegs []string) string {
	if len(fieldSegs) == 0 {
		return alias
	}
	return fmt.Sprintf("%s.%s", alias, strings.Join(fieldSegs, "."))
}

func (b *BodyConditionBuilder) buildArrayPath(plan PathPlan, aliases []string) string {
	if len(plan.TraversalSteps) == 0 {
		return b.buildFieldPath(aliases[0], plan.TailFieldSegs)
	}

	// Find the last array hop
	lastArrayIdx := -1
	for i := len(plan.TraversalSteps) - 1; i >= 0; i-- {
		if plan.TraversalSteps[i].isArr {
			lastArrayIdx = i
			break
		}
	}

	if lastArrayIdx == -1 {
		return b.buildFieldPath(aliases[0], plan.TailFieldSegs)
	}

	parentAlias := aliases[lastArrayIdx]
	terminalArrayName := plan.TraversalSteps[lastArrayIdx].Name
	return b.buildFieldPath(parentAlias, append(plan.TailFieldSegs, terminalArrayName))
}

func (b *BodyConditionBuilder) buildArrayMembership(arrayExpr string, operator qbtypes.FilterOperator, value any, elemType telemetrytypes.JSONDataType, sb *sqlbuilder.SelectBuilder) string {
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

func (b *BodyConditionBuilder) isLikeOperator(op qbtypes.FilterOperator) bool {
	return op == qbtypes.FilterOperatorContains || op == qbtypes.FilterOperatorLike || op == qbtypes.FilterOperatorILike
}

func (b *BodyConditionBuilder) isNotLikeOperator(op qbtypes.FilterOperator) bool {
	return op == qbtypes.FilterOperatorNotContains || op == qbtypes.FilterOperatorNotLike || op == qbtypes.FilterOperatorNotILike
}

func (b *BodyConditionBuilder) isNotOperator(op qbtypes.FilterOperator) bool {
	return op == qbtypes.FilterOperatorNotContains || op == qbtypes.FilterOperatorNotLike || op == qbtypes.FilterOperatorNotILike
}

func (b *BodyConditionBuilder) applyOperator(sb *sqlbuilder.SelectBuilder, fieldExpr string, operator qbtypes.FilterOperator, value any) (string, error) {
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
