package implservices

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
)

// validateTagFilterItems validates the tag filter items. This should be used before using
// buildFilterExpression or any other function that uses tag filter items.
func validateTagFilterItems(tags []servicetypesv1.TagFilterItem) error {
	for _, t := range tags {
		if t.Key == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "key is required")
		}
		if strings.ToLower(t.Operator) != "in" && strings.ToLower(t.Operator) != "notin" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "only in and notin operators are supported")
		}
		if len(t.StringValues) == 0 && len(t.BoolValues) == 0 && len(t.NumberValues) == 0 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "at least one of stringValues, boolValues, or numberValues must be populated")
		}
	}
	return nil
}

// buildFilterExpression converts tag filters into a QBv5-compatible filter expression and set of variableItems.
// before calling this function, should validate tags with validateTagFilterItems first.
func buildFilterExpression(tags []servicetypesv1.TagFilterItem) (string, map[string]qbtypes.VariableItem) {
	variables := make(map[string]qbtypes.VariableItem)
	parts := make([]string, 0, len(tags))
	valueItr := 1
	for _, t := range tags {
		valueIdentifier := fmt.Sprintf("%d", valueItr)

		switch strings.ToLower(t.Operator) {
		case "notin":
			if vals, ok := pickInValuesFromTag(t); ok {
				variables[valueIdentifier] = qbtypes.VariableItem{Type: qbtypes.DynamicVariableType, Value: vals}
			} else {
				continue
			}
			parts = append(parts, fmt.Sprintf("%s NOT IN $%s", t.Key, valueIdentifier))
		case "in":
			if vals, ok := pickInValuesFromTag(t); ok {
				variables[valueIdentifier] = qbtypes.VariableItem{Type: qbtypes.DynamicVariableType, Value: vals}
			} else {
				continue
			}
			parts = append(parts, fmt.Sprintf("%s IN $%s", t.Key, valueIdentifier))
		default:
			continue
		}

		valueItr++
	}

	filterExpr := strings.Join(parts, " AND ")
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

// toUint64 safely converts a cell value to uint64.
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
// If opsMap is nil, it performs no changes.
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
