package dashboardtypes

import (
	"fmt"
	"regexp"
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

// aggExprRe extracts a single "func(args)" aggregation with an optional
// "as alias" (bare word or quoted). Mirrors the regex in the frontend's
// parseAggregations (prepareQueryRangePayloadV5.ts). Because it only matches
// well-formed func(args), it naturally discards trailing junk like the stray
// ")" some source expressions carry ("sum(x) ) )" → "sum(x)").
var aggExprRe = regexp.MustCompile(`([a-zA-Z0-9_]+\([^)]*\))(?:\s*as\s+('[^']*'|"[^"]*"|[a-zA-Z0-9_-]+))?`)

// normalizePreV5LogTraceAggregations reshapes a logs/traces builder query's
// aggregations into the v5 {"expression", "alias"} form in place, dropping the
// metric-only fields (metricName/temporality/timeAggregation/spaceAggregation/
// reduceTo) that some dashboards carry on non-metric queries — a logs query
// with a metric-shaped aggregation fails the strict v5 decode ("unknown field
// metricName"). Mirrors the frontend's createAggregation
// (prepareQueryRangePayloadV5.ts): each source expression is run through
// parseAggregations, which extracts the well-formed func(args) parts, lifts any
// inline "as alias" into the alias field, and splits a comma-joined multi-part
// expression into separate aggregations. An expression that yields nothing
// falls back to "count()". Metric queries are left untouched, since a
// metric-shaped aggregation is correct for them.
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
	out := make([]any, 0, len(aggs))
	for _, a := range aggs {
		agg, ok := a.(map[string]any)
		if !ok {
			continue
		}
		expr, _ := agg["expression"].(string)
		alias, _ := agg["alias"].(string)
		parsed := parseAggregations(expr, alias)
		if len(parsed) == 0 {
			parsed = []any{map[string]any{"expression": "count()"}}
		}
		out = append(out, parsed...)
	}
	query["aggregations"] = out
}

// parseAggregations extracts every func(args) aggregation from a v1 expression
// string, pulling an inline "as alias" (or the passed-through availableAlias)
// into a separate alias field and stripping surrounding quotes. Mirrors the
// frontend's parseAggregations (prepareQueryRangePayloadV5.ts). Returns nil when
// the expression contains no well-formed aggregation.
func parseAggregations(expression, availableAlias string) []any {
	matches := aggExprRe.FindAllStringSubmatch(expression, -1)
	out := make([]any, 0, len(matches))
	for _, m := range matches {
		alias := m[2]
		if alias == "" {
			alias = availableAlias
		}
		agg := map[string]any{"expression": m[1]}
		if alias != "" {
			agg["alias"] = strings.Trim(alias, `'"`)
		}
		out = append(out, agg)
	}
	return out
}

// normalizePreV5SelectColumns fixes a builder query's selectColumns in place so
// WrapInV5Envelope maps them correctly. That mapper reads the old
// {key, dataType, type} shape, but some queries store selectColumns the v5 way
// ({name, fieldDataType, fieldContext}) — those come out with an empty name
// ("field `` not found"). Backfill the old keys from the v5 ones (so both
// shapes work) and drop columns with no resolvable name, mirroring the
// frontend's `name ?? key` read plus its empty-column filter
// (prepareQueryRangePayloadV5.ts). This runs before WrapInV5Envelope; note it
// is the inverse direction of normalizePreV5FieldKeys because the two consumers
// (WrapInV5Envelope vs. the list-panel TelemetryFieldKey decode) expect
// opposite shapes.
func normalizePreV5SelectColumns(query map[string]any) {
	cols, ok := query["selectColumns"].([]any)
	if !ok {
		return
	}
	out := make([]any, 0, len(cols))
	for _, c := range cols {
		col, ok := c.(map[string]any)
		if !ok {
			continue
		}
		if _, ok := col["key"]; !ok {
			if name, ok := col["name"]; ok {
				col["key"] = name
			}
		}
		if _, ok := col["dataType"]; !ok {
			if fdt, ok := col["fieldDataType"]; ok {
				col["dataType"] = fdt
			}
		}
		if _, ok := col["type"]; !ok {
			if fc, ok := col["fieldContext"]; ok {
				col["type"] = fc
			}
		}
		if key, _ := col["key"].(string); key == "" {
			continue
		}
		out = append(out, col)
	}
	query["selectColumns"] = out
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
