package dashboardtypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// ══════════════════════════════════════════════
// Malformed-field normalization
// ══════════════════════════════════════════════
//
// Reshape known-malformed v1 fields into their v5 form before decode. A common
// case: a dashboard stamped version:"v5" whose bodies aren't actually v5-shaped
// bypasses the v4→v5 migrator (pkg/transition) and then fails the strict v5
// decode. These mirror the frontend, which normalizes by shape regardless of
// the version tag.
//
// Only reshape known field shapes here; leave genuinely corrupt input (e.g. an
// empty required field) to fail validation rather than grow per-case fixups.

// normalizeV1Having rewrites a builder query's v4 having (an array of
// {columnName, op, value} clauses) into the v5 {"expression": ...} shape in
// place. The v5 decoder wants an object, but a query can still carry the array
// form — e.g. a dashboard stamped version:"v5" whose bodies predate v5, which
// the v4→v5 migrator skips wholesale on the version tag. Mirrors the frontend's
// convertHavingToExpression (QueryBuilderV2/utils.ts): each clause becomes
// "columnName op value", clauses join with " AND ", array values render as
// "[v1, v2]". A having that is already an object (or absent) is left untouched.
func normalizeV1Having(query map[string]any) {
	clauses, ok := query["having"].([]any)
	if !ok {
		return
	}
	exprs := make([]string, 0, len(clauses))
	for _, c := range clauses {
		clause, ok := c.(map[string]any)
		if !ok {
			continue
		}
		col, _ := clause["columnName"].(string)
		if col == "" {
			continue
		}
		op, _ := clause["op"].(string)
		exprs = append(exprs, fmt.Sprintf("%s %s %s", col, op, formatHavingValue(clause["value"])))
	}
	query["having"] = map[string]any{"expression": strings.Join(exprs, " AND ")}
}

// normalizeV1LogTraceAggregations reshapes a logs/traces builder query's
// aggregations into the v5 {"expression", "alias"} form in place, dropping the
// metric-only fields (metricName/temporality/timeAggregation/spaceAggregation/
// reduceTo) that some dashboards carry on non-metric queries — a logs query
// with a metric-shaped aggregation fails the strict v5 decode ("unknown field
// metricName"). Mirrors the frontend's createAggregation
// (prepareQueryRangePayloadV5.ts): logs/traces read only the expression and
// default an empty one to "count()". Metric queries are left untouched, since a
// metric-shaped aggregation is correct for them. Idempotent on aggregations
// that are already expression-only.
func normalizeV1LogTraceAggregations(query map[string]any) {
	switch signalFromDataSource(query["dataSource"]) {
	case telemetrytypes.SignalLogs, telemetrytypes.SignalTraces:
	default:
		return
	}
	aggs, ok := query["aggregations"].([]any)
	if !ok {
		return
	}
	for i, a := range aggs {
		agg, ok := a.(map[string]any)
		if !ok {
			continue
		}
		expr, _ := agg["expression"].(string)
		if strings.TrimSpace(expr) == "" {
			expr = "count()"
		}
		normalized := map[string]any{"expression": expr}
		if alias, ok := agg["alias"].(string); ok && alias != "" {
			normalized["alias"] = alias
		}
		aggs[i] = normalized
	}
}

// formatHavingValue renders a having clause value: an array as "[v1, v2]", any
// scalar as its default string form.
func formatHavingValue(value any) string {
	arr, ok := value.([]any)
	if !ok {
		return fmt.Sprintf("%v", value)
	}
	parts := make([]string, len(arr))
	for i, v := range arr {
		parts[i] = fmt.Sprintf("%v", v)
	}
	return "[" + strings.Join(parts, ", ") + "]"
}
