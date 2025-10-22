package implservices

import (
	"fmt"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
)

// buildFilterAndScopeExpression converts tag filters into a QBv5-compatible filter expression and set of variableItems
func buildFilterAndScopeExpression(tags []servicetypesv1.TagFilterItem) (string, map[string]qbtypes.VariableItem) {
	variables := make(map[string]qbtypes.VariableItem)
	parts := make([]string, 0, len(tags))
	valueItr := 1
	for _, t := range tags {
		valueIdentifier := fmt.Sprintf("%d", valueItr)

		switch strings.ToLower(t.Operator) {
		case "in":
			if vals, ok := pickInValuesFromTag(t); ok {
				variables[valueIdentifier] = qbtypes.VariableItem{Type: qbtypes.DynamicVariableType, Value: vals}
			} else {
				continue
			}
			parts = append(parts, fmt.Sprintf("%s IN $%s", t.Key, valueIdentifier))
		case "equal", "=":
			if v, ok := pickEqualValueFromTag(t); ok {
				variables[valueIdentifier] = qbtypes.VariableItem{Type: qbtypes.DynamicVariableType, Value: v}
			} else {
				continue
			}
			parts = append(parts, fmt.Sprintf("%s = $%s", t.Key, valueIdentifier))
		default:
			// skip unsupported for now
			continue
		}

		valueItr++
	}

	// now also add the condition representing top level operations permitted only
	filterExpr := strings.Join(parts, " AND ")
	scopeExpr := fmt.Sprintf("isRoot = $%d OR isEntryPoint = $%d", valueItr, valueItr+1)
	if filterExpr != "" {
		filterExpr = "(" + filterExpr + ") AND (" + scopeExpr + ")"
	} else {
		filterExpr = scopeExpr
	}
	variables[fmt.Sprintf("%d", valueItr)] = qbtypes.VariableItem{
		Type:  qbtypes.DynamicVariableType,
		Value: true,
	}
	variables[fmt.Sprintf("%d", valueItr+1)] = qbtypes.VariableItem{
		Type:  qbtypes.DynamicVariableType,
		Value: true,
	}
	return filterExpr, variables
}

// pickInValuesFromTag returns a []any for IN operator in the precedence order of
// StringValues, BoolValues, NumberValues. Returns false if none are populated.
func pickInValuesFromTag(t servicetypesv1.TagFilterItem) ([]any, bool) {
	if len(t.StringValues) > 0 {
		vals := make([]any, 0, len(t.StringValues))
		for _, v := range t.StringValues {
			vals = append(vals, v)
		}
		return vals, true
	}
	if len(t.BoolValues) > 0 {
		vals := make([]any, 0, len(t.BoolValues))
		for _, v := range t.BoolValues {
			vals = append(vals, v)
		}
		return vals, true
	}
	if len(t.NumberValues) > 0 {
		vals := make([]any, 0, len(t.NumberValues))
		for _, v := range t.NumberValues {
			vals = append(vals, v)
		}
		return vals, true
	}
	return nil, false
}

// pickEqualValueFromTag returns a scalar any for EQUAL operator using the
// precedence order string, bool, number. Returns false if none are populated.
func pickEqualValueFromTag(t servicetypesv1.TagFilterItem) (any, bool) {
	if len(t.StringValues) > 0 {
		return t.StringValues[0], true
	}
	if len(t.BoolValues) > 0 {
		return t.BoolValues[0], true
	}
	if len(t.NumberValues) > 0 {
		return t.NumberValues[0], true
	}
	return nil, false
}

// toFloat safely converts a cell value to float64, returning 0 on type mismatch.
func toFloat(row []any, idx int) float64 {
	if idx < 0 || idx >= len(row) || row[idx] == nil {
		return 0
	}
	v, ok := row[idx].(float64)
	if !ok {
		return 0
	}
	return v
}

// toUint64 safely converts a cell value to uint64, guarding against negatives and nils.
func toUint64(row []any, idx int) uint64 {
	if idx < 0 || idx >= len(row) || row[idx] == nil {
		return 0
	}
	v, ok := row[idx].(uint64)
	if !ok {
		return 0
	}
	return v
}

// applyOpsToItems sets topLevelOps for matching service names.
// If opsMap is nil, it performs no changes and returns nil.
func applyOpsToItems(items []*servicetypesv1.ResponseItem, opsMap map[string][]string) {
	if len(items) == 0 {
		return
	}
	if opsMap == nil {
		return
	}
	for i := range items {
		if items[i] == nil {
			continue
		}
		if tops, ok := opsMap[items[i].ServiceName]; ok {
			items[i].DataWarning.TopLevelOps = tops
		}
	}
}
