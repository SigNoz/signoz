package telemetrylogs

import (
	"context"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	CodePlanIndexOutOfBounds = errors.MustNewCode("plan_index_out_of_bounds")
)

type JSONAccessPlanBuilder struct {
	key        *telemetrytypes.TelemetryFieldKey
	value      any
	op         qbtypes.FilterOperator
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
	pathSoFar := strings.Join(pb.parts[:index+1], telemetrytypes.ArraySep)
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
		valueType, _ := inferDataType(pb.value, pb.op, pb.key)
		node.TerminalConfig = &telemetrytypes.TerminalConfig{
			Key:       pb.key,
			ElemType:  *pb.key.JSONDataType,
			ValueType: telemetrytypes.MappingFieldDataTypeToJSONDataType[valueType],
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
func PlanJSON(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator,
	value any,
	getTypes func(ctx context.Context, path string) ([]telemetrytypes.JSONDataType, error),
) (telemetrytypes.JSONAccessPlan, error) {
	// if path is empty, return nil
	if key.Name == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "path is empty")
	}

	// TODO: PlanJSON requires the Start and End of the Query to select correct column between promoted and body_json using
	// creation time in distributed_promoted_paths
	path := strings.ReplaceAll(key.Name, telemetrytypes.ArrayAnyIndex, telemetrytypes.ArraySep)
	parts := strings.Split(path, telemetrytypes.ArraySep)

	pb := &JSONAccessPlanBuilder{
		key:        key,
		op:         op,
		value:      value,
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
