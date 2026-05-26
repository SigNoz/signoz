package telemetrytypes

import (
	"fmt"
	"maps"
	"slices"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/exporter/jsontypeexporter"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type JSONAccessBranchType struct {
	valuer.String
}

var (
	BranchJSON    = JSONAccessBranchType{valuer.NewString("json")}
	BranchDynamic = JSONAccessBranchType{valuer.NewString("dynamic")}

	CodePlanIndexOutOfBounds     = errors.MustNewCode("plan_index_out_of_bounds")
	CodePlanFieldDataTypeMissing = errors.MustNewCode("field_data_type_missing")
)

type JSONColumnMetadata struct {
	BaseColumn     string
	PromotedColumn string
}

type JSONAccessPlan = []*JSONAccessNode

type TerminalConfig struct {
	Key      *TelemetryFieldKey
	ElemType JSONDataType
}

// Node is now a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types.
type JSONAccessNode struct {
	// Node information
	Name       string
	IsTerminal bool
	isRoot     bool // marked true for only body_v2 and body_promoted

	// Array type branches (Array(JSON) vs Array(Dynamic))
	Branches map[JSONAccessBranchType]*JSONAccessNode

	// Terminal configuration
	TerminalConfig *TerminalConfig

	// Parent reference for traversal
	Parent *JSONAccessNode

	// JSON progression parameters (precomputed during planning)
	MaxDynamicTypes int
	MaxDynamicPaths int
}

func NewRootJSONAccessNode(name string, maxDynamicTypes, maxDynamicPaths int) *JSONAccessNode {
	return &JSONAccessNode{
		Name:            name,
		isRoot:          true,
		MaxDynamicTypes: maxDynamicTypes,
		MaxDynamicPaths: maxDynamicPaths,
	}
}

func (n *JSONAccessNode) Alias() string {
	if n.isRoot {
		return n.Name
	} else if n.Parent == nil {
		return fmt.Sprintf("`%s`", n.Name)
	}

	parentAlias := strings.TrimLeft(n.Parent.Alias(), "`")
	parentAlias = strings.TrimRight(parentAlias, "`")

	sep := jsontypeexporter.ArraySeparator
	if n.Parent.isRoot {
		sep = "."
	}
	return fmt.Sprintf("`%s%s%s`", parentAlias, sep, n.Name)
}

func (n *JSONAccessNode) FieldPath() string {
	key := "`" + n.Name + "`"
	return n.Parent.Alias() + "." + key
}

// Returns true if the current node is a non-nested path.
func (n *JSONAccessNode) IsNonNestedPath() bool {
	return !strings.Contains(n.FieldPath(), ArraySep)
}

func (n *JSONAccessNode) BranchesInOrder() []JSONAccessBranchType {
	return slices.SortedFunc(maps.Keys(n.Branches), func(a, b JSONAccessBranchType) int {
		return strings.Compare(b.StringValue(), a.StringValue())
	})
}

type planBuilder struct {
	key        *TelemetryFieldKey
	paths      []string // cumulative paths for type cache lookups
	segments   []string // individual path segments for node names
	isPromoted bool
	typeCache  map[string][]FieldDataType
}

// buildPlan recursively builds the path plan tree.
func (pb *planBuilder) buildPlan(index int, parent *JSONAccessNode, isDynArrChild bool) (*JSONAccessNode, error) {
	if index >= len(pb.paths) {
		return nil, errors.NewInvalidInputf(CodePlanIndexOutOfBounds, "index is out of bounds")
	}

	pathSoFar := pb.paths[index]      // cumulative path for type cache lookup
	segmentName := pb.segments[index] // segment name for node
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

	// Create node for this path segment
	node := &JSONAccessNode{
		Name:            segmentName,
		IsTerminal:      isTerminal,
		Branches:        make(map[JSONAccessBranchType]*JSONAccessNode),
		Parent:          parent,
		MaxDynamicTypes: maxTypes,
		MaxDynamicPaths: maxPaths,
	}

	// Configure terminal if this is the last part
	if isTerminal {
		// fielddatatype must not be unspecified else expression can not be generated
		if pb.key.FieldDataType == FieldDataTypeUnspecified {
			return nil, errors.NewInternalf(CodePlanFieldDataTypeMissing, "field data type is missing for path %s", pathSoFar)
		}

		node.TerminalConfig = &TerminalConfig{
			Key:      pb.key,
			ElemType: pb.key.GetJSONDataType(),
		}
	} else {
		var err error
		// Use cached types from the batched metadata query
		types, ok := pb.typeCache[pathSoFar]
		if !ok {
			return nil, errors.NewInternalf(errors.CodeInvalidInput, "types missing for path %s", pathSoFar)
		}

		hasJSON := slices.Contains(types, FieldDataTypeArrayJSON)
		hasDynamic := slices.Contains(types, FieldDataTypeArrayDynamic)
		if !hasJSON && !hasDynamic {
			return nil, errors.NewInternalf(CodePlanFieldDataTypeMissing, "array data type missing for path %s", pathSoFar)
		}

		if hasJSON {
			node.Branches[BranchJSON], err = pb.buildPlan(index+1, node, false)
			if err != nil {
				return nil, err
			}
		}
		if hasDynamic {
			node.Branches[BranchDynamic], err = pb.buildPlan(index+1, node, true)
			if err != nil {
				return nil, err
			}
		}
	}

	return node, nil
}

// buildJSONAccessPlan builds a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types.
func (key *TelemetryFieldKey) SetJSONAccessPlan(columnInfo JSONColumnMetadata, typeCache map[string][]FieldDataType,
) error {
	// if path is empty, return nil
	if key.Name == "" {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "path is empty")
	}

	pb := &planBuilder{
		key:        key,
		paths:      key.ArrayParentPaths(),
		segments:   key.ArrayPathSegments(),
		isPromoted: key.Materialized,
		typeCache:  typeCache,
	}

	node, err := pb.buildPlan(0,
		NewRootJSONAccessNode(columnInfo.BaseColumn,
			32, 0),
		false,
	)
	if err != nil {
		return err
	}
	key.JSONPlan = append(key.JSONPlan, node)

	if pb.isPromoted {
		node, err := pb.buildPlan(0,
			NewRootJSONAccessNode(columnInfo.PromotedColumn,
				32, 1024),
			true,
		)
		if err != nil {
			return err
		}
		key.JSONPlan = append(key.JSONPlan, node)
	}

	return nil
}
