package telemetrylogs

import (
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/exporter/jsontypeexporter"
	"github.com/SigNoz/signoz-otel-collector/pkg/keycheck"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var arraySep = jsontypeexporter.ArraySeparator

// Node is now a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
type Node struct {
	// Node information
	Name       string
	IsArray    bool
	IsTerminal bool
	isRoot     bool // marked true for only body_v2 and promoted

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
	if n.isRoot {
		return n.Name
	} else if n.Parent == nil {
		return fmt.Sprintf("`%s`", n.Name)
	}

	parentAlias := strings.TrimLeft(n.Parent.Alias(), "`")
	parentAlias = strings.TrimRight(parentAlias, "`")

	sep := arraySep
	if n.Parent.isRoot {
		sep = "."
	}
	return fmt.Sprintf("`%s%s%s`", parentAlias, sep, n.Name)
}

func (n *Node) FieldPath() string {
	key := n.Name
	if keycheck.IsBacktickRequired(key) {
		key = "`" + key + "`"
	}

	return n.Parent.Alias() + "." + key
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

// chooseArrayPreference decides whether to search scalar or array at the terminal
// and returns the preferred element type for the terminal comparison.
func (node *Node) decideElemType(operator qbtypes.FilterOperator, valueType telemetrytypes.JSONDataType) (preferArray bool, elem telemetrytypes.JSONDataType) {
	available := node.AvailableTypes
	// Rule: if no available types, decision cannot be made → ElemType = ValueType, no array preference
	if len(available) == 0 {
		return false, valueType
	}

	hasScalar := slices.Contains(available, valueType)
	hasArray := func() bool {
		return slices.Contains(available, telemetrytypes.ScalerTypeToArrayType[valueType]) || slices.Contains(available, telemetrytypes.ArrayDynamic)
	}()

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

// Rule 1: valueType is determined based on the Value
// Rule 1.1: if Value is nil (incase of EXISTS/NOT EXISTS + GroupBy) then on Operator and AvailableTypes
// Rule 2: decision cannot be made if no type available; set ElemType = ValueType
// Rule 3: elemType is determined based on the Operator, ValueType and the AvailableTypes all three in consideration
// Rule 4: PreferArrayAtEnd can never be true if Scaler Arrays with matching type with ValueType aren't available with Contains operator
// configureTerminal sets up terminal node configuration
func (node *Node) configureTerminal(operator qbtypes.FilterOperator, value any) {
	// ValueType: inference for normal operators; for EXISTS/group-by pick from availability (rule 5)
	valueType := node.determineValueType(node.AvailableTypes, operator, value)

	// ElemType: decision based only on scalar and scalar arrays + operator + ValueType (rules 1,3,4,6)
	preferArray, elemType := node.decideElemType(operator, valueType)

	// Rule: if decision couldn't be made, ElemType equals ValueType handled inside chooser
	node.TerminalConfig = &TerminalConfig{
		PreferArrayAtEnd: preferArray,
		ElemType:         elemType,
		ValueType:        valueType,
		Operator:         operator,
		Value:            value,
	}
}

func (node *Node) determineValueType(availableTypes []telemetrytypes.JSONDataType, operator qbtypes.FilterOperator, value any) telemetrytypes.JSONDataType {
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
	vt, _ := node.inferDataType(value, operator)
	return vt
}

func (node *Node) inferDataType(value any, operator qbtypes.FilterOperator) (telemetrytypes.JSONDataType, any) {
	// check if the value is a int, float, string, bool
	valueType := telemetrytypes.Dynamic
	switch v := value.(type) {
	case []any:
		// take the first element and infer the type
		if len(v) > 0 {
			valueType, _ = node.inferDataType(v[0], operator)
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

// buildPlan recursively builds the path plan tree
func (b *JSONQueryBuilder) buildPlan(parts []string, index int, operator qbtypes.FilterOperator, value any, parent *Node, isDynArrChild bool) *Node {
	if index >= len(parts) {
		return nil
	}

	part := parts[index]
	pathSoFar := strings.Join(parts[:index+1], arraySep)
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

	// Create node for this path segment
	node := &Node{
		Name:            part,
		IsArray:         !isTerminal, // Only non-terminal parts are arrays
		IsTerminal:      isTerminal,
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
		node.configureTerminal(operator, value)
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
