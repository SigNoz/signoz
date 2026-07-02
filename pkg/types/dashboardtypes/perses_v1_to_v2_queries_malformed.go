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
// Reshape known-malformed query-builder fields from their pre-v5 shape into the
// v5 form before decode. A common case: a dashboard stamped version:"v5" whose
// bodies aren't actually v5-shaped bypasses the v4→v5 migrator (pkg/transition)
// and then fails the strict v5 decode. These mirror the frontend, which
// normalizes by shape regardless of the version tag.
//
// Only reshape known field shapes here; leave genuinely corrupt input (e.g. an
// empty required field) to fail validation rather than grow per-case fixups.

// normalizePreV5Having rewrites a builder query's v4 having (an array of
// {columnName, op, value} clauses) into the v5 {"expression": ...} shape in
// place. The v5 decoder wants an object, but a query can still carry the array
// form — e.g. a dashboard stamped version:"v5" whose bodies predate v5, which
// the v4→v5 migrator skips wholesale on the version tag. Mirrors the frontend's
// convertHavingToExpression (QueryBuilderV2/utils.ts): each clause becomes
// "columnName op value", clauses join with " AND ", array values render as
// "[v1, v2]". A having that is already an object (or absent) is left untouched.
func normalizePreV5Having(query map[string]any) {
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

// normalizePreV5LogTraceAggregations reshapes a logs/traces builder query's
// aggregations into the v5 {"expression", "alias"} form in place, dropping the
// metric-only fields (metricName/temporality/timeAggregation/spaceAggregation/
// reduceTo) that some dashboards carry on non-metric queries — a logs query
// with a metric-shaped aggregation fails the strict v5 decode ("unknown field
// metricName"). Mirrors the frontend's createAggregation
// (prepareQueryRangePayloadV5.ts): logs/traces read only the expression and
// default an empty one to "count()". Metric queries are left untouched, since a
// metric-shaped aggregation is correct for them. Idempotent on aggregations
// that are already expression-only.
func normalizePreV5LogTraceAggregations(query map[string]any) {
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

// normalizePreV5FieldKeys renames telemetry field keys from the pre-v5
// query-builder shape ({key, dataType, type}) to the v5 one ({name,
// fieldDataType, fieldContext}) in place — the same mapping WrapInV5Envelope
// does for groupBy/orderBy. Without it an old-shape field decodes with an empty
// name, which TelemetryFieldKey rejects. Entries already carrying "name" are
// left as-is.
func normalizePreV5FieldKeys(fields []any) {
	for _, f := range fields {
		field, ok := f.(map[string]any)
		if !ok {
			continue
		}
		if _, hasName := field["name"]; hasName {
			continue
		}
		if key, ok := field["key"]; ok {
			field["name"] = key
		}
		if dataType, ok := field["dataType"]; ok {
			field["fieldDataType"] = dataType
		}
		if typ, ok := field["type"]; ok {
			field["fieldContext"] = typ
		}
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
