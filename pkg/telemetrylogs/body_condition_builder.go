package telemetrylogs

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz-otel-collector/utils"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

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
		return telemetrytypes.Int
	case "Float64":
		return telemetrytypes.Float64
	case "Bool":
		return telemetrytypes.Bool
	case "Array(Nullable(String))":
		return telemetrytypes.ArrayString
	case "Array(Nullable(Int64))":
		return telemetrytypes.ArrayInt
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

// resolve retained for potential future use; currently unused to keep API surface minimal.

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
		valueType = telemetrytypes.Int
	case float32, float64:
		valueType = telemetrytypes.Float64
	case string:
		fieldDataType, parsedValue := parseStrValue(v, operator)
		valueType = telemetrytypes.MappingFieldDataTypeToJSONDataType[fieldDataType]
		value = parsedValue
	case bool:
		valueType = telemetrytypes.Bool
	}

	return valueType, value
}

// BuildCondition builds the full WHERE condition for body_v2 JSON paths,
// attaching any needed CTE fragments for array-of-JSON traversal.
func (b *BodyConditionBuilder) BuildConditionWithExtras(ctx context.Context, key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, qbtypes.ConditionExtras, error) {

	path := strings.TrimPrefix(key.Name, BodyJSONStringSearchPrefix)

	// Try to get the type from cache first
	var dataType telemetrytypes.JSONDataType
	if cachedSet, exists := b.cache.Load(path); exists {
		if set, ok := cachedSet.(*utils.ConcurrentSet[telemetrytypes.JSONDataType]); ok && set.Len() > 0 {
			slice := set.ToSlice()
			if len(slice) > 0 {
				dataType = slice[0]
			}
		}
	}

	// Fall back to inferring from value if not in cache
	if dataType.StringValue() == "" {
		dataType, value = b.inferDataType(value, operator)
	}
	// If no array-json traversal required, use direct dynamicElement
	if !strings.Contains(path, ":") {
		base := "body_v2." + path
		fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", base, dataType.StringValue())
		cond, err := b.applyOperator(sb, fieldExpr, operator, value)
		if err != nil {
			return "", qbtypes.ConditionExtras{}, err
		}
		sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, cond))
		return cond, qbtypes.ConditionExtras{}, nil
	}

	// For any operator requiring array-json traversal, use nested arrayExists pattern
	if strings.Contains(path, ":") {
		parts := strings.Split(path, ":")
		if len(parts) >= 2 {
			// Build a dynamic nested arrayExists chain using cache to detect inner arrays inside tail
			outerArray := parts[0]
			tail := parts[len(parts)-1]

			// Start with outer source array
			sourceExpr := fmt.Sprintf("ifNull(dynamicElement(body_v2.%s, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'), [])", outerArray)

			// Variable names are derived from array seg names to keep queries deterministic

			// Determine segments inside tail and which of them are inner arrays by consulting cache with prefix
			tailSegs := []string{}
			if tail != "" {
				tailSegs = strings.Split(tail, ".")
			}
			// Prefix used for cache lookup of inner arrays: e.g. "education"
			arrayPathPrefix := outerArray

			// We will accumulate an inner condition, starting from the deepest point, then wrap outward
			// Build a list of steps representing traversal through possible inner arrays
			type step struct {
				kind string // "array" or "field"
				name string // segment name
			}
			steps := []step{}
			for i := 0; i < len(tailSegs); i++ {
				seg := tailSegs[i]
				// Check if this seg is an inner array using cache: key format prefix+":"+seg
				cacheKey := arrayPathPrefix + ":" + seg
				if cached, ok := b.cache.Load(cacheKey); ok {
					if set, ok2 := cached.(*utils.ConcurrentSet[telemetrytypes.JSONDataType]); ok2 {
						slice := set.ToSlice()
						isArray := false
						for _, t := range slice {
							if t.IsArray || strings.HasPrefix(t.StringValue(), "Array(") {
								isArray = true
								break
							}
						}
						if isArray {
							steps = append(steps, step{kind: "array", name: seg})
							arrayPathPrefix = arrayPathPrefix + ":" + seg
							continue
						}
					}
				}
				// Otherwise it's a field access
				steps = append(steps, step{kind: "field", name: seg})
			}

			// Construct the inner-most field path expression relative to the current variable
			buildFieldRef := func(currVar string, fieldSegs []string) string {
				if len(fieldSegs) == 0 {
					return currVar
				}
				return fmt.Sprintf("%s.%s", currVar, strings.Join(fieldSegs, "."))
			}

			// Walk steps: for each inner array step, we wrap current condition; for trailing fields we build IS NOT NULL
			// Start by splitting steps into alternating arrays and final field chain under the last array
			// We process from outer to inner, maintaining a stack of arrayExists
			currentFieldSegs := []string{}
			// Collect contiguous field segs at the end
			j := len(steps) - 1
			for j >= 0 && steps[j].kind == "field" {
				currentFieldSegs = append([]string{steps[j].name}, currentFieldSegs...)
				j--
			}
			// Build terminal condition relative to the deepest array variable (or outer if none)
			deepestIdx := 0
			arrayVarNames := []string{""} // index 0 reserved for outer array name
			for _, st := range steps {
				if st.kind == "array" {
					deepestIdx++
					arrayVarNames = append(arrayVarNames, st.name+"_json")
				}
			}
			// assign depth 0 to outer array variable name
			if len(arrayVarNames) > 0 {
				arrayVarNames[0] = outerArray
			}
			terminalVar := func() string {
				if deepestIdx == 0 {
					// no inner arrays; use a single element variable name
					return "el"
				}
				return arrayVarNames[deepestIdx]
			}()
			_ = buildFieldRef // retained helper in case raw refs are needed later
			// Decide raw vs typed field expression based on operator type
			rawFieldRef := buildFieldRef(terminalVar, currentFieldSegs)
			var fieldExpr string
			switch operator {
			case qbtypes.FilterOperatorExists, qbtypes.FilterOperatorNotExists:
				fieldExpr = rawFieldRef
			default:
				// terminalVar already refers to a JSON element due to array coercion; no need to wrap again
				jsonBase := terminalVar
				var fieldPath string
				if len(currentFieldSegs) == 0 {
					fieldPath = jsonBase
				} else {
					fieldPath = fmt.Sprintf("%s.%s", jsonBase, strings.Join(currentFieldSegs, "."))
				}
				fieldExpr = fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, dataType.StringValue())
			}
			c, err := b.applyOperator(sb, fieldExpr, operator, value)
			if err != nil {
				return "", qbtypes.ConditionExtras{}, err
			}
			innerCond := c

			// Now wrap inner arrays from inner to outer using arrayMap/arrayFilter to normalize to JSON
			currArrayDepth := deepestIdx
			// Position in steps to process arrays backwards
			for k := len(steps) - len(currentFieldSegs) - 1; k >= 0; k-- {
				st := steps[k]
				if st.kind != "array" {
					continue
				}
				// inner variable name derived from segment for readability and determinism
				iv := arrayVarNames[currArrayDepth]
				// parent variable is previous depth: outer array name at depth 0 else prior array seg name
				parentVar := arrayVarNames[currArrayDepth-1]
				// inner array under parentVar JSON: parentVar.seg
				innerArrayDyn := fmt.Sprintf("ifNull(dynamicElement(dynamicElement(%s, 'JSON').%s, 'Array(Dynamic)'), [])", parentVar, st.name)
				filteredToJSON := fmt.Sprintf("arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), %s))", innerArrayDyn)
				wrapped := fmt.Sprintf("arrayExists(%s-> %s, %s)", iv, innerCond, filteredToJSON)
				innerCond = wrapped
				currArrayDepth--
			}

			// Finally, wrap the outermost arrayExists over the sourceExpr using the actual outer array name as variable
			ov := outerArray
			existsCond := fmt.Sprintf("arrayExists(%s-> %s, %s)", ov, innerCond, sourceExpr)
			cond := existsCond
			sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, cond))
			return cond, qbtypes.ConditionExtras{}, nil
		}
	}

	// WHERE-only for array hops: use nested arrayExists over Array(Dynamic) with JSON filtering.
	// Syntax: for path a:b:...:z.tail, build
	// arrayExists(x0 -> dynamicType(x0)='JSON' AND arrayExists(x1 -> dynamicType(x1)='JSON' AND ... cond(dynamicElement(dynamicElement(xN,'JSON').tail,'T')) ...,
	//            dynamicElement(body_v2.a, 'Array(Dynamic)'))

	parts := strings.Split(path, ":")
	arraySegs := parts[:len(parts)-1]
	tail := parts[len(parts)-1] // may contain dots like "c.d"

	// Build innermost condition over last hop variable
	// Helper builds condition string given the variable name that refers to the JSON element at last hop
	buildTerminalCond := func(varName string) (string, error) {
		// Access nested keys off the JSON element
		jsonBase := fmt.Sprintf("dynamicElement(%s, 'JSON')", varName)
		var fieldPath string
		if tail == "" {
			fieldPath = jsonBase
		} else {
			fieldPath = fmt.Sprintf("%s.%s", jsonBase, tail)
		}
		fieldExpr := fmt.Sprintf("dynamicElement(%s, '%s')", fieldPath, dataType.StringValue())
		return b.applyOperator(sb, fieldExpr, operator, value)
	}

	// Build nested arrayExists from inner to outer
	// Start with innermost condition
	cond := ""
	var err error
	for idx := len(arraySegs) - 1; idx >= 0; idx-- {
		varName := fmt.Sprintf("x%d", idx)
		if cond == "" {
			// terminal
			cond, err = buildTerminalCond(varName)
			if err != nil {
				return "", qbtypes.ConditionExtras{}, err
			}
		}

		// Build base array expression for this hop
		var base string
		if idx == 0 {
			base = fmt.Sprintf("body_v2.%s", arraySegs[0])
		} else {
			// previous outer variable represents parent JSON element
			prevVar := fmt.Sprintf("x%d", idx-1)
			base = fmt.Sprintf("dynamicElement(%s, 'JSON').%s", prevVar, arraySegs[idx])
		}

		// Wrap with arrayExists at this level
		cond = fmt.Sprintf(
			"arrayExists(%s -> dynamicType(%s) = 'JSON' AND (%s), dynamicElement(%s, '%s'))",
			varName, varName, cond, base, telemetrytypes.ArrayDynamic.StringValue(),
		)
	}

	sb.AddWhereClause(sqlbuilder.NewWhereClause().AddWhereExpr(sb.Args, cond))
	return cond, qbtypes.ConditionExtras{}, nil
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
