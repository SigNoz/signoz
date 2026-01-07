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
	isPromoted bool
	typeCache  map[string][]telemetrytypes.JSONDataType
}

// buildPlan recursively builds the path plan tree
func (pb *JSONAccessPlanBuilder) buildPlan(index int, parent *telemetrytypes.JSONAccessNode, isDynArrChild bool) (*telemetrytypes.JSONAccessNode, error) {
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

	// Use cached types from the batched metadata query
	types := pb.typeCache[pathSoFar]

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

// PlanJSON builds a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
func PlanJSON(ctx context.Context, key *telemetrytypes.TelemetryFieldKey, op qbtypes.FilterOperator,
	value any,
	metadataStore telemetrytypes.MetadataStore,
) (telemetrytypes.JSONAccessPlan, error) {
	// if path is empty, return nil
	if key.Name == "" {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "path is empty")
	}

	path := strings.ReplaceAll(key.Name, telemetrytypes.ArrayAnyIndex, telemetrytypes.ArraySep)
	parts := strings.Split(path, telemetrytypes.ArraySep)

	// Pre-fetch JSON types for all path prefixes in a single metadata call to avoid
	// multiple small DB queries during plan construction.
	// Extract all path prefixes that will be needed during recursive buildPlan calls
	selectors := make([]*telemetrytypes.FieldKeySelector, 0, len(parts))
	for i := range parts {
		pathSoFar := strings.Join(parts[:i+1], telemetrytypes.ArraySep)
		selectors = append(selectors, &telemetrytypes.FieldKeySelector{
			Name:              pathSoFar,
			SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
			Signal:            telemetrytypes.SignalLogs,
			Limit:             1,
		})
	}

	keys, _, err := metadataStore.GetKeysMulti(ctx, selectors)
	if err != nil {
		return nil, err
	}

	// Build type cache from the batched results
	typeCache := make(map[string][]telemetrytypes.JSONDataType, len(keys))
	for name, ks := range keys {
		types := make([]telemetrytypes.JSONDataType, 0, len(ks))
		for _, k := range ks {
			if k.JSONDataType != nil {
				types = append(types, *k.JSONDataType)
			}
		}
		typeCache[name] = types
	}

	pb := &JSONAccessPlanBuilder{
		key:        key,
		op:         op,
		value:      value,
		parts:      parts,
		isPromoted: key.Materialized,
		typeCache:  typeCache,
	}
	plans := telemetrytypes.JSONAccessPlan{}

	node, err := pb.buildPlan(0,
		telemetrytypes.NewRootJSONAccessNode(LogsV2BodyJSONColumn,
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
