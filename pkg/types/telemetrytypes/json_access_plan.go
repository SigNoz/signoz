package telemetrytypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz-otel-collector/exporter/jsontypeexporter"
)

type JSONAccessBranchType string
type JSONAccessPlan = []*JSONAccessNode

const (
	BranchJSON    JSONAccessBranchType = "json"
	BranchDynamic JSONAccessBranchType = "dynamic"
)

type TerminalConfig struct {
	Key       *TelemetryFieldKey
	ElemType  JSONDataType
	ValueType JSONDataType
}

// Node is now a tree structure representing the complete JSON path traversal
// that precomputes all possible branches and their types
type JSONAccessNode struct {
	// Node information
	Name       string
	IsTerminal bool
	isRoot     bool // marked true for only body_json and body_json_promoted

	// Precomputed type information (single source of truth)
	AvailableTypes []JSONDataType

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
