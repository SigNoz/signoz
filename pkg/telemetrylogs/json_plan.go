package telemetrylogs

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/exporter/jsontypeexporter"
	"github.com/SigNoz/signoz-otel-collector/pkg/keycheck"
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	ArraySep                 = jsontypeexporter.ArraySeparator
	arrayAnyIndex            = "[*]."
	CodePlanIndexOutOfBounds = errors.MustNewCode("plan_index_out_of_bounds")
)

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

// Node is now a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
type Node struct {
	// Node information
	Name       string
	IsTerminal bool
	isRoot     bool // marked true for only body_json and body_json_promoted

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

	sep := ArraySep
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
		return true, telemetrytypes.ScalerTypeToArrayType[valueType]
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

type PlanBuilder struct {
	parts      []string
	operator   qbtypes.FilterOperator
	value      any
	getTypes   func(ctx context.Context, path string) ([]telemetrytypes.JSONDataType, error)
	isPromoted bool
}

// buildPlan recursively builds the path plan tree
func (pb *PlanBuilder) buildPlan(ctx context.Context, index int, parent *Node, isDynArrChild bool) (*Node, error) {
	if index >= len(pb.parts) {
		return nil, errors.NewInvalidInputf(CodePlanIndexOutOfBounds, "index is out of bounds")
	}

	part := pb.parts[index]
	pathSoFar := strings.Join(pb.parts[:index+1], ArraySep)
	isTerminal := index == len(pb.parts)-1

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

	types, err := pb.getTypes(ctx, pathSoFar)
	if err != nil {
		return nil, err
	}

	// Create node for this path segment
	node := &Node{
		Name:            part,
		IsTerminal:      isTerminal,
		AvailableTypes:  types,
		Branches:        make(map[BranchType]*Node),
		Parent:          parent,
		MaxDynamicTypes: maxTypes,
		MaxDynamicPaths: maxPaths,
	}

	hasJSON := slices.Contains(node.AvailableTypes, telemetrytypes.ArrayJSON)
	hasDynamic := slices.Contains(node.AvailableTypes, telemetrytypes.ArrayDynamic)

	// Configure terminal if this is the last part
	if isTerminal {
		node.configureTerminal(pb.operator, pb.value)
	} else {
		if hasJSON {
			node.Branches[BranchJSON], err = pb.buildPlan(ctx, index+1, node, false)
			if err != nil {
				return nil, err
			}
		}
		if hasDynamic {
			node.Branches[BranchDynamic], err = pb.buildPlan(ctx, index+1, node, true)
			if err != nil {
				return nil, err
			}
		}
	}

	return node, nil
}

// PlanJSON builds a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
func PlanJSON(ctx context.Context, path string,
	operator qbtypes.FilterOperator, value any, isPromoted bool,
	getTypes func(ctx context.Context, path string) ([]telemetrytypes.JSONDataType, error),
) ([]*Node, error) {
	// if path is empty, return nil
	if path == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "path is empty")
	}

	// TODO: PlanJSON requires the Start and End of the Query to select correct column between promoted and body_json using
	// creation time in distributed_promoted_paths
	path = strings.ReplaceAll(path, arrayAnyIndex, ArraySep)
	parts := strings.Split(path, ArraySep)

	pb := &PlanBuilder{
		parts:      parts,
		operator:   operator,
		value:      value,
		getTypes:   getTypes,
		isPromoted: isPromoted,
	}
	plans := []*Node{}

	node, err := pb.buildPlan(ctx, 0, &Node{
		Name:            LogsV2BodyJSONColumn,
		isRoot:          true,
		MaxDynamicTypes: 32,
		MaxDynamicPaths: 0,
	}, false)
	if err != nil {
		return nil, err
	}
	plans = append(plans, node)

	if isPromoted {
		node, err := pb.buildPlan(ctx, 0, &Node{
			Name:            LogsV2BodyPromotedColumn,
			isRoot:          true,
			MaxDynamicTypes: 32,
			MaxDynamicPaths: 1024,
		}, true)
		if err != nil {
			return nil, err
		}
		plans = append(plans, node)
	}

	return plans, nil
}

// Operator intent helpers
func isMembershipContains(op qbtypes.FilterOperator) bool {
	return op == qbtypes.FilterOperatorContains || op == qbtypes.FilterOperatorNotContains
}

func isMembershipLike(op qbtypes.FilterOperator) bool {
	return op == qbtypes.FilterOperatorLike || op == qbtypes.FilterOperatorILike || op == qbtypes.FilterOperatorNotLike
}
