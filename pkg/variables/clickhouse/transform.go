package clickhouse

import (
	"fmt"
	"slices"
	"strings"

	"github.com/AfterShip/clickhouse-sql-parser/parser"
	"github.com/SigNoz/signoz/pkg/variables"
)

// VariableValue represents a variable's assigned value
type VariableValue struct {
	Name        string
	Values      []string
	IsSelectAll bool
	FieldType   string // "scalar", "array", "map", etc.
}

// QueryTransformer handles the transformation of queries based on variable values
type QueryTransformer struct {
	processor   *QueryProcessor
	variables   map[string]VariableValue
	originalSQL string
}

// NewQueryTransformer creates a new transformer with the given SQL and variables
func NewQueryTransformer(sql string, vars []VariableValue) *QueryTransformer {
	varMap := make(map[string]VariableValue)
	for _, v := range vars {
		if slices.Contains(variables.ReservedTimeVars, v.Name) {
			continue
		}
		varMap[v.Name] = v
	}

	for _, v := range variables.ReservedTimeVars {
		varMap[v] = VariableValue{
			Name:        v,
			IsSelectAll: false,
			FieldType:   "scalar",
		}
	}

	// for each variable, replace the `{{variable_name}}`, [[variable_name]], {{ .variable_name }}, {{.variable_name}}
	// with $variable_name
	for name := range varMap {
		sql = strings.Replace(sql, fmt.Sprintf("{{%s}}", name), fmt.Sprintf("$%s", name), -1)
		sql = strings.Replace(sql, fmt.Sprintf("[[%s]]", name), fmt.Sprintf("$%s", name), -1)
		sql = strings.Replace(sql, fmt.Sprintf("{{ .%s }}", name), fmt.Sprintf("$%s", name), -1)
		sql = strings.Replace(sql, fmt.Sprintf("{{.%s}}", name), fmt.Sprintf("$%s", name), -1)
	}

	return &QueryTransformer{
		processor:   NewQueryProcessor(),
		variables:   varMap,
		originalSQL: sql,
	}
}

// Transform processes the query and returns a transformed version
func (t *QueryTransformer) Transform() (string, error) {
	return t.processor.ProcessQuery(t.originalSQL, t.transformFilter)
}

// transformFilter is the callback function that decides what to do with each filter
func (t *QueryTransformer) transformFilter(variableName string, expr parser.Expr) FilterAction {
	// Check if we have info about this variable
	varInfo, exists := t.variables[variableName]
	if !exists {
		// If we don't have info, keep the filter as is
		return KeepFilter
	}

	// If the user selected "__all__", we should remove the filter
	if varInfo.IsSelectAll {
		return RemoveFilter
	}

	// For maps, we might want to check for existence rather than equality
	if varInfo.FieldType == "map" {
		return ReplaceWithExistsCheck
	}

	// Otherwise keep the filter as is (it will be filled with the actual values)
	return KeepFilter
}
