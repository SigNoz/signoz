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

// preV5MetricOpToAggregation maps a legacy v3 compound metric operator to its
// (timeAggregation, spaceAggregation) pair, for bodies too old to carry those
// fields of their own. Mirrors the operator switch in the migrator's
// createAggregations metric branch (pkg/transition).
var preV5MetricOpToAggregation = map[string][2]string{
	"sum_rate": {"rate", "sum"}, "rate_sum": {"rate", "sum"},
	"avg_rate": {"rate", "avg"}, "rate_avg": {"rate", "avg"},
	"min_rate": {"rate", "min"}, "rate_min": {"rate", "min"},
	"max_rate": {"rate", "max"}, "rate_max": {"rate", "max"},
	"hist_quantile_50": {"", "p50"}, "hist_quantile_75": {"", "p75"},
	"hist_quantile_90": {"", "p90"}, "hist_quantile_95": {"", "p95"},
	"hist_quantile_99": {"", "p99"},
	"rate":             {"rate", "sum"},
	"min":              {"min", "min"}, "max": {"max", "max"},
	"avg": {"avg", "avg"}, "sum": {"sum", "sum"},
	"count": {"count", "sum"}, "count_distinct": {"count_distinct", "sum"},
	"noop": {"max", "max"},
}

// normalizePreV5MetricAggregations rebuilds a metric builder query's v5
// aggregations[] from the flat v4/v3 aggregation fields (aggregateOperator,
// aggregateAttribute, timeAggregation, spaceAggregation, temporality, reduceTo)
// in place. WrapInV5Envelope copies a v5 aggregations[] through but drops those
// flat fields, so a metric query stored in the old flat shape — e.g. a dashboard
// mislabeled version:"v5" that skipped the v4→v5 migrator — would otherwise
// migrate to a metric query with no aggregation at all: a silently empty panel,
// not a loud decode error. Mirrors the migrator's createAggregations metric
// branch (pkg/transition): prefer the query's own timeAggregation/
// spaceAggregation, else derive them from the compound operator. A query already
// carrying a non-empty aggregations[] (or lacking the flat operator/attribute)
// is left untouched. The metric-shaped result is correct only for metric
// queries; logs/traces go through normalizePreV5LogTraceAggregations instead.
func normalizePreV5MetricAggregations(query map[string]any) {
	if signalFromDataSource(query["dataSource"]) != telemetrytypes.SignalMetrics {
		return
	}
	if aggs, ok := query["aggregations"].([]any); ok && len(aggs) > 0 {
		return
	}
	op, hasOp := query["aggregateOperator"].(string)
	attr, hasAttr := query["aggregateAttribute"].(map[string]any)
	if !hasOp || !hasAttr {
		return
	}

	timeAgg, _ := query["timeAggregation"].(string)
	spaceAgg, _ := query["spaceAggregation"].(string)
	switch {
	case timeAgg != "" || spaceAgg != "":
		if spaceAgg == "" {
			spaceAgg = op // migrator's default when spaceAggregation is absent
		}
	default:
		mapped, ok := preV5MetricOpToAggregation[op]
		if !ok {
			return // too old to recognize; leave it to fail validation
		}
		timeAgg, spaceAgg = mapped[0], mapped[1]
	}

	agg := map[string]any{
		"metricName":       attr["key"],
		"timeAggregation":  timeAgg,
		"spaceAggregation": spaceAgg,
	}
	if temporality, ok := query["temporality"]; ok && temporality != nil {
		agg["temporality"] = temporality
	}
	if reduceTo, ok := query["reduceTo"].(string); ok && reduceTo != "" {
		agg["reduceTo"] = reduceTo
	}
	query["aggregations"] = []any{agg}
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

// normalizePreV5Filters rewrites a builder query's v4 filters (an object
// {items:[{key:{key,dataType,type}, op, value}], op}) into the v5
// filter {"expression": ...} shape in place. WrapInV5Envelope copies a v5
// `filter` through but ignores the v4 plural `filters`, so an un-normalized v4
// body silently loses its filter entirely. Mirrors the backend v4→v5 migrator's
// createFilterExpression (pkg/transition), which the mislabeled-v5 bodies
// bypass; buildPreV5FilterCondition also folds the deprecated operators
// (nin→NOT IN, regex→REGEXP, nlike/ncontains/nregex/nexists/nhas) into their v5
// forms. A query already carrying `filter` (or with no items) is left untouched.
func normalizePreV5Filters(query map[string]any) {
	if _, ok := query["filter"]; ok {
		return
	}
	filters, ok := query["filters"].(map[string]any)
	if !ok {
		return
	}
	items, ok := filters["items"].([]any)
	if !ok || len(items) == 0 {
		return
	}
	op, _ := filters["op"].(string)
	if op == "" {
		op = "AND"
	}
	conditions := make([]string, 0, len(items))
	for _, it := range items {
		item, ok := it.(map[string]any)
		if !ok {
			continue
		}
		key, ok := item["key"].(map[string]any)
		if !ok {
			continue
		}
		keyStr, _ := key["key"].(string)
		value, valueOk := item["value"]
		if keyStr == "" || !valueOk {
			continue
		}
		operator, _ := item["op"].(string)
		dataType, _ := key["dataType"].(string)
		if cond := buildPreV5FilterCondition(keyStr, operator, value, dataType); cond != "" {
			conditions = append(conditions, cond)
		}
	}
	if len(conditions) == 0 {
		return
	}
	expr := conditions[0]
	if len(conditions) > 1 {
		expr = "(" + strings.Join(conditions, " "+op+" ") + ")"
	}
	query["filter"] = map[string]any{"expression": expr}
	delete(query, "filters")
}

// buildPreV5FilterCondition renders one v4 filter item as a v5 expression
// clause. Mirrors the backend migrator's buildCondition (pkg/transition): the
// operator switch normalizes deprecated tokens (nin/nlike/regex/nregex/
// ncontains/nexists/nhas) and downgrades a single-value IN/NOT IN to =/!=. It
// omits the migrator's data-source ambiguity prefixing (needs per-signal config
// we don't carry) and variable normalization (dotted vars are a backend
// substitute_vars concern, left verbatim).
func buildPreV5FilterCondition(key, operator string, value any, dataType string) string {
	fv := formatPreV5FilterValue(value, dataType)
	switch operator {
	case "=", "!=", ">", ">=", "<", "<=":
		return fmt.Sprintf("%s %s %s", key, operator, fv)
	case "in", "IN":
		if !strings.HasPrefix(fv, "[") && !isPreV5Variable(fv) {
			return fmt.Sprintf("%s = %s", key, fv)
		}
		return fmt.Sprintf("%s IN %s", key, fv)
	case "nin", "NOT IN":
		if !strings.HasPrefix(fv, "[") && !isPreV5Variable(fv) {
			return fmt.Sprintf("%s != %s", key, fv)
		}
		return fmt.Sprintf("%s NOT IN %s", key, fv)
	case "like", "LIKE":
		return fmt.Sprintf("%s LIKE %s", key, fv)
	case "nlike", "NOT LIKE":
		return fmt.Sprintf("%s NOT LIKE %s", key, fv)
	case "contains":
		return fmt.Sprintf("%s CONTAINS %s", key, fv)
	case "ncontains":
		return fmt.Sprintf("%s NOT CONTAINS %s", key, fv)
	case "regex":
		return fmt.Sprintf("%s REGEXP %s", key, fv)
	case "nregex":
		return fmt.Sprintf("%s NOT REGEXP %s", key, fv)
	case "exists":
		return fmt.Sprintf("%s EXISTS", key)
	case "nexists":
		return fmt.Sprintf("%s NOT EXISTS", key)
	case "has":
		return fmt.Sprintf("has(%s, %s)", key, fv)
	case "nhas":
		return fmt.Sprintf("NOT has(%s, %s)", key, fv)
	default:
		return fmt.Sprintf("%s %s %s", key, operator, fv)
	}
}

// formatPreV5FilterValue renders a filter value for a v5 expression. Mirrors the
// migrator's formatValue: variables pass through verbatim, numeric-typed numeric
// strings stay unquoted, other strings are single-quoted (escaping embedded
// quotes), a single-element array collapses to its element, and a multi-element
// array becomes "[v1, v2]".
func formatPreV5FilterValue(value any, dataType string) string {
	switch v := value.(type) {
	case string:
		if isPreV5Variable(v) {
			return v
		}
		if isNumericDataType(dataType) {
			if _, err := fmt.Sscanf(v, "%f", new(float64)); err == nil {
				return v
			}
		}
		return "'" + strings.ReplaceAll(v, "'", `\'`) + "'"
	case bool:
		return fmt.Sprintf("%t", v)
	case []any:
		if len(v) == 1 {
			return formatPreV5FilterValue(v[0], dataType)
		}
		parts := make([]string, len(v))
		for i, item := range v {
			parts[i] = formatPreV5FilterValue(item, dataType)
		}
		return "[" + strings.Join(parts, ", ") + "]"
	default:
		return fmt.Sprintf("%v", v)
	}
}

// preV5VariablePatterns are the dashboard-variable syntaxes a filter value may
// carry ({var}, {{var}}, $var, [[var]], ${{var}}); such values are passed
// through unquoted. Mirrors the migrator's isVariable patterns verbatim.
var preV5VariablePatterns = []*regexp.Regexp{
	regexp.MustCompile(`^\{.*\}$`),
	regexp.MustCompile(`^\{\{.*\}\}$`),
	regexp.MustCompile(`^\$.*$`),
	regexp.MustCompile(`^\[\[.*\]\]$`),
	regexp.MustCompile(`^\$\{\{.*\}\}$`),
}

func isPreV5Variable(s string) bool {
	s = strings.TrimSpace(s)
	for _, re := range preV5VariablePatterns {
		if re.MatchString(s) {
			return true
		}
	}
	return false
}

// isNumericDataType reports whether a v1 field dataType names a numeric type, in
// which case a numeric-looking value renders unquoted. Mirrors the migrator's
// isNumericType.
func isNumericDataType(dataType string) bool {
	switch dataType {
	case "int", "int8", "int16", "int32", "int64",
		"uint", "uint8", "uint16", "uint32", "uint64",
		"float", "float32", "float64",
		"number", "numeric", "integer":
		return true
	default:
		return false
	}
}

// normalizePreV5PageSize backfills a builder query's limit from the legacy
// pageSize field in place, matching the frontend's `limit || pageSize` read in
// prepareQueryRangePayloadV5.ts — which applies only to the row-limited panels
// (list/table), so rowLimitPanel gates it. A query already carrying limit, or a
// non-row-limited panel, is left untouched.
func normalizePreV5PageSize(query map[string]any, rowLimitPanel bool) {
	if !rowLimitPanel {
		return
	}
	if _, ok := query["limit"]; ok {
		return
	}
	if ps, ok := query["pageSize"]; ok {
		query["limit"] = ps
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
