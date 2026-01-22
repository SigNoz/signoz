package telemetrymetadata

import (
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrylogs"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

var (
	CodePlanIndexOutOfBounds = errors.MustNewCode("plan_index_out_of_bounds")
)

type JSONAccessPlanBuilder struct {
	key        *telemetrytypes.TelemetryFieldKey
	paths      []string
	isPromoted bool
	typeCache  map[string][]telemetrytypes.JSONDataType
}

// buildPlan recursively builds the path plan tree
func (pb *JSONAccessPlanBuilder) buildPlan(index int, parent *telemetrytypes.JSONAccessNode, isDynArrChild bool) (*telemetrytypes.JSONAccessNode, error) {
	if index >= len(pb.paths) {
		return nil, errors.NewInvalidInputf(CodePlanIndexOutOfBounds, "index is out of bounds")
	}

	part := pb.paths[index]
	pathSoFar := strings.Join(pb.paths[:index+1], telemetrytypes.ArraySep)
	isTerminal := index == len(pb.paths)-1

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

	// Use cached types from the batched metadata query
	types, ok := pb.typeCache[pathSoFar]
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInvalidInput, "types missing for path %s", pathSoFar)
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
			Key:       pb.key,
			ElemType:  *pb.key.JSONDataType,
		}
	} else {
		var err error
		if hasJSON {
			node.Branches[telemetrytypes.BranchJSON], err = pb.buildPlan(index+1, node, false)
			if err != nil {
				return nil, err
			}
		}
		if hasDynamic {
			node.Branches[telemetrytypes.BranchDynamic], err = pb.buildPlan(index+1, node, true)
			if err != nil {
				return nil, err
			}
		}
	}

	return node, nil
}

// buildJSONAccessPlan builds a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
func buildJSONAccessPlan(key *telemetrytypes.TelemetryFieldKey, typeCache map[string][]telemetrytypes.JSONDataType,
) (telemetrytypes.JSONAccessPlan, error) {
	// if path is empty, return nil
	if key.Name == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "path is empty")
	}


	pb := &JSONAccessPlanBuilder{
		key:        key,
		paths:      key.ArrayParentPaths(),
		isPromoted: key.Materialized,
		typeCache:  typeCache,
	}
	plans := telemetrytypes.JSONAccessPlan{}

	node, err := pb.buildPlan(0,
		telemetrytypes.NewRootJSONAccessNode(telemetrylogs.LogsV2BodyJSONColumn,
			32, 0),
		false,
	)
	if err != nil {
		return nil, err
	}
	plans = append(plans, node)

	// TODO: PlanJSON requires the Start and End of the Query to select correct column between promoted and body_json using
	// creation time in distributed_promoted_paths
	if pb.isPromoted {
		node, err := pb.buildPlan(0,
			telemetrytypes.NewRootJSONAccessNode(telemetrylogs.LogsV2BodyPromotedColumn,
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
