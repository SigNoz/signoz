package telemetrylogs

import (
	"context"
	"slices"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/exporter/jsontypeexporter"
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	ArraySep                 = jsontypeexporter.ArraySeparator
	ArrayAnyIndex            = "[*]."
	CodePlanIndexOutOfBounds = errors.MustNewCode("plan_index_out_of_bounds")
)

// Rule 1: valueType is determined based on the Value
// Rule 1.1: if Value is nil (incase of EXISTS/NOT EXISTS + GroupBy) then on Operator and AvailableTypes
// Rule 2: decision cannot be made if no type available; set ElemType = ValueType
// Rule 3: elemType is determined based on the Operator, ValueType and the AvailableTypes all three in consideration
// configureTerminal sets up terminal node configuration
// func (pb *JSONAccessPlanBuilder) configureTerminalNode(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any) {
// 	// ValueType: inference for normal operators; for EXISTS/group-by pick from availability (rule 5)
// 	// valueType := pb.determineValueType(node, operator, value)
// 	var elemType telemetrytypes.JSONDataType

// 	hasScalar := slices.Contains(node.AvailableTypes, valueType)
// 	hasArray := func() bool {
// 		return slices.Contains(node.AvailableTypes, telemetrytypes.ScalerTypeToArrayType[valueType]) || slices.Contains(node.AvailableTypes, telemetrytypes.ArrayDynamic)
// 	}()

// 	// Rule: Universal logic for all operators
// 	// Prefer scalar when available; if only array exists, choose array; else fallback to ValueType
// 	if hasScalar {
// 		elemType = valueType
// 	} else if hasArray {
// 		elemType = telemetrytypes.ScalerTypeToArrayType[valueType]
// 	} else {
// 		elemType = valueType
// 	}
// 	// Rule: if decision couldn't be made, ElemType equals ValueType handled inside chooser
// 	node.TerminalConfig = &telemetrytypes.TerminalConfig{
// 		ElemType:  elemType,
// 		ValueType: valueType,
// 	}
// }

// func (pb *JSONAccessPlanBuilder) determineValueType(node *telemetrytypes.JSONAccessNode, operator qbtypes.FilterOperator, value any) telemetrytypes.JSONDataType {
// 	// For GroupBy operations (EXISTS operator with nil value), use the first available type
// 	if operator == qbtypes.FilterOperatorExists && value == nil {
// 		if len(node.AvailableTypes) > 0 {
// 			// For GroupBy, prefer scalar types over array types
// 			for _, t := range node.AvailableTypes {
// 				if !t.IsArray {
// 					return t
// 				}
// 			}
// 			// If no scalar types, use the first available type
// 			return node.AvailableTypes[0]
// 		}

// 		// Fallback to String if no types available
// 		return telemetrytypes.String
// 	}

// 	// For other operations, derive from input value/operator
// 	vt, _ := pb.inferDataType(node, value, operator)
// 	return vt
// }

// func (pb *JSONAccessPlanBuilder) inferDataType(node *telemetrytypes.JSONAccessNode, value any, operator qbtypes.FilterOperator) (telemetrytypes.JSONDataType, any) {
// 	// check if the value is a int, float, string, bool
// 	valueType := telemetrytypes.Dynamic
// 	switch v := value.(type) {
// 	case []any:
// 		// take the first element and infer the type
// 		if len(v) > 0 {
// 			valueType, _ = pb.inferDataType(node, v[0], operator)
// 		}
// 		return valueType, v
// 	case uint8, uint16, uint32, uint64, int, int8, int16, int32, int64:
// 		valueType = telemetrytypes.Int64
// 	case float32:
// 		f := float64(v)
// 		if IsFloatActuallyInt(f) {
// 			valueType = telemetrytypes.Int64
// 			value = int64(f)
// 		} else {
// 			valueType = telemetrytypes.Float64
// 		}
// 	case float64:
// 		if IsFloatActuallyInt(v) {
// 			valueType = telemetrytypes.Int64
// 			value = int64(v)
// 		} else {
// 			valueType = telemetrytypes.Float64
// 		}
// 	case string:
// 		fieldDataType, parsedValue := ParseStrValue(v, operator)
// 		valueType = telemetrytypes.MappingFieldDataTypeToJSONDataType[fieldDataType]
// 		value = parsedValue
// 	case bool:
// 		valueType = telemetrytypes.Bool
// 	}

// 	return valueType, value
// }

// // IsFloatActuallyInt checks if a float64 has an exact int64 representation
// func IsFloatActuallyInt(f float64) bool {
// 	return float64(int64(f)) == f
// }

type JSONAccessPlanBuilder struct {
	key        *telemetrytypes.TelemetryFieldKey
	parts      []string
	getTypes   func(ctx context.Context, path string) ([]telemetrytypes.JSONDataType, error)
	isPromoted bool
}

// buildPlan recursively builds the path plan tree
func (pb *JSONAccessPlanBuilder) buildPlan(ctx context.Context, index int, parent *telemetrytypes.JSONAccessNode, isDynArrChild bool) (*telemetrytypes.JSONAccessNode, error) {
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
	node := &telemetrytypes.JSONAccessNode{
		Name:            part,
		IsTerminal:      isTerminal,
		AvailableTypes:  types,
		Branches:        make(map[telemetrytypes.JSONAccessBranchType]*telemetrytypes.JSONAccessNode),
		Parent:          parent,
		MaxDynamicTypes: maxTypes,
		MaxDynamicPaths: maxPaths,
	}

	hasJSON := slices.Contains(node.AvailableTypes, telemetrytypes.ArrayJSON)
	hasDynamic := slices.Contains(node.AvailableTypes, telemetrytypes.ArrayDynamic)

	// Configure terminal if this is the last part
	if isTerminal {
		node.TerminalConfig = &telemetrytypes.TerminalConfig{
			ElemType: *pb.key.JSONDataType,
		}
	} else {
		if hasJSON {
			node.Branches[telemetrytypes.BranchJSON], err = pb.buildPlan(ctx, index+1, node, false)
			if err != nil {
				return nil, err
			}
		}
		if hasDynamic {
			node.Branches[telemetrytypes.BranchDynamic], err = pb.buildPlan(ctx, index+1, node, true)
			if err != nil {
				return nil, err
			}
		}
	}

	return node, nil
}

// PlanJSON builds a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
func PlanJSON(ctx context.Context, key *telemetrytypes.TelemetryFieldKey,
	operator qbtypes.FilterOperator, value any,
	getTypes func(ctx context.Context, path string) ([]*telemetrytypes.JSONDataType, error),
) (telemetrytypes.JSONAccessPlan, error) {
	// if path is empty, return nil
	if key.Name == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "path is empty")
	}

	// TODO: PlanJSON requires the Start and End of the Query to select correct column between promoted and body_json using
	// creation time in distributed_promoted_paths
	path := strings.ReplaceAll(key.Name, ArrayAnyIndex, ArraySep)
	parts := strings.Split(path, ArraySep)

	pb := &JSONAccessPlanBuilder{
		key:        key,
		parts:      parts,
		getTypes:   getTypes,
		isPromoted: key.Materialized,
	}
	plans := telemetrytypes.JSONAccessPlan{}

	node, err := pb.buildPlan(ctx, 0,
		telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn,
			32, 0),
		false,
	)
	if err != nil {
		return nil, err
	}
	plans = append(plans, node)

	if pb.isPromoted {
		node, err := pb.buildPlan(ctx, 0,
			telemetrytypes.NewRootJSONAccessNode(LogsV2BodyPromotedColumn,
				32, 1024),
			true,
		)
		if err != nil {
			return nil, err
		}
		plans = append(plans, node)
	}

	return plans, nil
}
