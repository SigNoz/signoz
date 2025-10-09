package implservices

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/servicetypes/servicetypesv1"
)

// buildFilterExpression converts tag filters into a QBv5-compatible boolean expression.
func buildFilterExpression(tags []servicetypesv1.TagFilterItem) string {
	if len(tags) == 0 {
		return ""
	}
	parts := make([]string, 0, len(tags))
	for _, t := range tags {
		key := t.Key
		switch strings.ToLower(t.Operator) {
		case "in":
			if len(t.StringValues) == 0 {
				continue
			}
			// Use QBv5 IN syntax directly: key IN ['a','b']
			vals := make([]string, 0, len(t.StringValues))
			for _, v := range t.StringValues {
				vals = append(vals, fmt.Sprintf("'%s'", escapeSingleQuotes(v)))
			}
			parts = append(parts, fmt.Sprintf("%s IN [%s]", key, strings.Join(vals, ",")))
		case "equal", "=":
			if len(t.StringValues) == 0 {
				continue
			}
			parts = append(parts, fmt.Sprintf("%s = '%s'", key, escapeSingleQuotes(t.StringValues[0])))
		default:
			// skip unsupported for now
		}
	}
	return strings.Join(parts, " AND ")
}

// escapeSingleQuotes escapes single quotes in string literals for filter expressions.
func escapeSingleQuotes(s string) string {
	return strings.ReplaceAll(s, "'", "\\'")
}

// toFloat safely converts a cell value to float64, returning 0 on type mismatch.
func toFloat(row []any, idx int) float64 {
	if idx < 0 || idx >= len(row) || row[idx] == nil {
		return 0
	}
	switch v := row[idx].(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int64:
		return float64(v)
	case int:
		return float64(v)
	case uint64:
		return float64(v)
	default:
		return 0
	}
}

// toUint64 safely converts a cell value to uint64, guarding against negatives and nils.
func toUint64(row []any, idx int) uint64 {
	if idx < 0 || idx >= len(row) || row[idx] == nil {
		return 0
	}
	switch v := row[idx].(type) {
	case uint64:
		return v
	case int64:
		if v < 0 {
			return 0
		}
		return uint64(v)
	case int:
		if v < 0 {
			return 0
		}
		return uint64(v)
	case float64:
		if v < 0 {
			return 0
		}
		return uint64(v)
	default:
		return 0
	}
}

// applyTopLevelOpsToItems sets DataWarning.TopLevelOps for matching service names.
// If opsMap is nil, it performs no changes and returns nil.
func applyTopLevelOpsToItems(items []*servicetypesv1.ResponseItem, opsMap map[string][]string) {
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
