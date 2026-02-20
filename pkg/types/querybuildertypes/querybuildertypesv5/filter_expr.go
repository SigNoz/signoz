package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/types/telemetrytypes"

// LogicalOp represents how child expressions are combined.
type LogicalOp string

const (
	// LogicalOpLeaf represents a leaf node containing one or more simple conditions.
	LogicalOpLeaf LogicalOp = "LEAF"
	// LogicalOpAnd represents an AND combination of children.
	LogicalOpAnd LogicalOp = "AND"
	// LogicalOpOr represents an OR combination of children.
	LogicalOpOr LogicalOp = "OR"
)

// FilterExprNode is a reusable logical representation of a filter expression.
//
// - Leaf nodes (Op == LogicalOpLeaf) contain one or more ParsedFilterCondition.
// - Non-leaf nodes (Op == LogicalOpAnd/LogicalOpOr) contain Children.
// - Negated indicates a leading NOT applied to this subtree.
type FilterExprNode struct {
	Op         LogicalOp
	Negated    bool
	Conditions []FilterCondition
	Children   []*FilterExprNode
}

func NewEmptyFilterExprNode() *FilterExprNode {
	return &FilterExprNode{
		Op: LogicalOpLeaf,
	}
}

func (f *FilterExprNode) Flatten() []FilterCondition {
	var conditions []FilterCondition
	var walk func(node *FilterExprNode)

	walk = func(node *FilterExprNode) {
		if node == nil {
			return
		}
		if node.Op == LogicalOpLeaf {
			conditions = append(conditions, node.Conditions...)
		}
		for _, child := range node.Children {
			walk(child)
		}
	}

	walk(f)
	return conditions
}

// FilterCondition represents a single comparison or existence check
// extracted from a filter expression.
//
//   - Keys:   one or more logical field keys on the left-hand side (see where_clause_visitor.VisitKey
//     for why one expression key can resolve to multiple TelemetryFieldKeys).
//   - Op:     filter operator (e.g. =, !=, in, exists, between).
//   - Value:  right-hand side literal (any type: single value, slice for IN/NOT IN, nil for EXISTS, etc.).
type FilterCondition struct {
	Key   *telemetrytypes.TelemetryFieldKey
	Op    FilterOperator
	Value any
}
