package dashboardtypes

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// ══════════════════════════════════════════════
// Malformed-field normalization
// ══════════════════════════════════════════════
//
// Pre-v5 query-body reshapes for dashboards whose bodies aren't actually v5-shaped
// (e.g. stamped version:"v5" but never upgraded). The bulk of the upgrade is
// delegated to transition.MigrateQueryDataShapeSafe (see normalizePreV5QueryData);
// this file keeps only the reshapes it doesn't cover.

// preV5Migrator runs transition's shape-safe (idempotent) v4→v5 upgrade. Stateless
// after construction, so a shared instance with a discard logger / no ambiguity
// keys is fine.
var preV5Migrator = transition.NewDashboardMigrateV5(slog.New(slog.DiscardHandler), nil, nil)

// normalizePreV5QueryData upgrades one builder queryData/formula in place: the
// shared migrator, then a reshape of any existing aggregations[] it leaves alone.
func normalizePreV5QueryData(query map[string]any, widgetType string, panelKind PanelPluginKind) {
	dropLegacyFilter(query)
	normalizeFilterItemOps(query)
	foldReduceToIntoMetricAggregations(query)
	preV5Migrator.MigrateQueryDataShapeSafe(context.Background(), query, widgetType)
	normalizePreV5LogTraceAggregations(query)
	normalizeMetricAggregations(query)
	// After the migrator has built aggregations from flat fields and the reshape above
	// has settled them; the caller's ensureDefaultAggregation only injects for logs/traces.
	ensureMetricReduceTo(query, panelKind)
	normalizeFunctionArgs(query)
	dropInvalidFunctions(query)
	// normalizeOrderByKeys runs in the caller, after ensureDefaultAggregation: a
	// value-order key resolves against the aggregation that may have just been injected.
}

// dropInvalidFunctions removes any function the v5 validator would reject — an unknown
// name, or a missing/uncastable required arg (see Function.Validate). v1 tolerated these
// but v2 fails the whole query, so we drop just the offending function. Runs after
// normalizeFunctionArgs so a merely double-wrapped (but otherwise valid) function isn't
// lost.
func dropInvalidFunctions(query map[string]any) {
	fns, ok := query["functions"].([]any)
	if !ok {
		return
	}
	kept := make([]any, 0, len(fns))
	for _, f := range fns {
		raw, err := json.Marshal(f)
		if err != nil {
			continue
		}
		var fn qb.Function
		if err := json.Unmarshal(raw, &fn); err != nil {
			continue
		}
		if fn.Validate() != nil {
			continue
		}
		kept = append(kept, f)
	}
	query["functions"] = kept
}

// normalizeFunctionArgs collapses a doubly-wrapped function arg to a scalar. The
// v4→v5 migration that runs before ConvertV1ToV2 (transition.updateQueryData) wraps every arg as
// {name, value} without checking whether it's already a v5 arg, so a body that was
// already v5 comes back as {value:{value:60}} and fails validation ("must be a floating
// value"). We can't guard it at the source — transition's Migrate is shared and left
// untouched — so unwrap one level of {value:...} nesting here.
func normalizeFunctionArgs(query map[string]any) {
	fns, ok := query["functions"].([]any)
	if !ok {
		return
	}
	for _, f := range fns {
		fn, ok := f.(map[string]any)
		if !ok {
			continue
		}
		args, ok := fn["args"].([]any)
		if !ok {
			continue
		}
		for _, a := range args {
			arg, ok := a.(map[string]any)
			if !ok {
				continue
			}
			if inner, ok := arg["value"].(map[string]any); ok {
				if v, ok := inner["value"]; ok {
					arg["value"] = v
				}
			}
		}
	}
}

// normalizeOrderByKeys rewrites any orderBy columnName the v5 aggregation validator
// would reject (validateOrderByForAggregation) to the canonical aggregation value key.
// v1 tolerated free-form "order by the value" aliases (#SIGNOZ_VALUE, the query name,
// the raw metric/expression) that the query-service resolved at query time; v2 accepts
// only a real order key. Anything already valid (a group-by key, an aggregation
// expression/alias/index) is left alone. No-op if no aggregation key can be named.
func normalizeOrderByKeys(query map[string]any) {
	orders, ok := query["orderBy"].([]any)
	if !ok {
		return
	}
	key, ok := aggregationOrderKey(query)
	if !ok {
		return
	}
	valid := validAggregationOrderKeys(query)
	for _, o := range orders {
		order, ok := o.(map[string]any)
		if !ok {
			continue
		}
		if cn, _ := order["columnName"].(string); cn != "" && !valid[cn] {
			order["columnName"] = key
		}
	}
}

// validAggregationOrderKeys is a line-for-line mirror of validateOrderByForAggregation
// (querybuildertypesv5/validation.go) over the untyped query map instead of a typed
// QueryBuilderQuery. Keep the two in lockstep — every insertion here must match one
// there — so a side-by-side read makes any drift obvious. The only adaptations: fields
// are read out of maps, the type switch on the aggregation becomes a switch on the
// query signal (metrics vs logs/traces), and a not-yet-upgraded group-by still carries
// the v4 "key" instead of the v5 "name".
func validAggregationOrderKeys(query map[string]any) map[string]bool {
	validOrderKeys := make(map[string]bool)

	for _, gb := range asObjects(query["groupBy"]) {
		name, _ := gb["name"].(string)
		if name == "" {
			name, _ = gb["key"].(string)
		}
		validOrderKeys[name] = true
	}

	signal := signalFromDataSource(query["dataSource"])
	for i, agg := range asObjects(query["aggregations"]) {
		validOrderKeys[fmt.Sprintf("%d", i)] = true

		switch signal {
		// TraceAggregation / LogAggregation (identical bodies in the validator).
		case telemetrytypes.SignalTraces, telemetrytypes.SignalLogs:
			if alias, _ := agg["alias"].(string); alias != "" {
				validOrderKeys[alias] = true
			}
			expression, _ := agg["expression"].(string)
			validOrderKeys[expression] = true

		// MetricAggregation.
		case telemetrytypes.SignalMetrics:
			// Also allow the generic __result pattern
			validOrderKeys["__result"] = true

			metricName, _ := agg["metricName"].(string)
			spaceRaw, _ := agg["spaceAggregation"].(string)
			timeRaw, _ := agg["timeAggregation"].(string)
			spaceAggregation := metrictypes.SpaceAggregation{String: valuer.NewString(spaceRaw)}
			timeAggregation := metrictypes.TimeAggregation{String: valuer.NewString(timeRaw)}

			validOrderKeys[fmt.Sprintf("%s(%s)", spaceAggregation.StringValue(), metricName)] = true
			if timeAggregation != metrictypes.TimeAggregationUnspecified {
				validOrderKeys[fmt.Sprintf("%s(%s)", timeAggregation.StringValue(), metricName)] = true
			}
			if timeAggregation != metrictypes.TimeAggregationUnspecified && spaceAggregation != metrictypes.SpaceAggregationUnspecified {
				validOrderKeys[fmt.Sprintf("%s(%s(%s))", spaceAggregation.StringValue(), timeAggregation.StringValue(), metricName)] = true
			}
		}
	}

	return validOrderKeys
}

// asObjects returns the map elements of a []any, skipping non-object entries.
func asObjects(raw any) []map[string]any {
	items, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(items))
	for _, it := range items {
		if m, ok := it.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

// aggregationOrderKey names the first aggregation the way validateOrderByForAggregation
// expects: "space(metricName)" for metrics, the expression for logs/traces.
func aggregationOrderKey(query map[string]any) (string, bool) {
	aggs, ok := query["aggregations"].([]any)
	if !ok || len(aggs) == 0 {
		return "", false
	}
	agg, ok := aggs[0].(map[string]any)
	if !ok {
		return "", false
	}
	if signalFromDataSource(query["dataSource"]) == telemetrytypes.SignalMetrics {
		metricName, _ := agg["metricName"].(string)
		space, _ := agg["spaceAggregation"].(string)
		if metricName == "" || space == "" {
			return "", false
		}
		return space + "(" + metricName + ")", true
	}
	expr, _ := agg["expression"].(string)
	if expr == "" {
		return "", false
	}
	return expr, true
}

// backfillFormulaFields restores order/limit/having onto the formula's spec.
// WrapInV5Envelope's formula branch emits only name/expression/disabled/legend/functions
// and drops these three, even though QueryBuilderFormula supports them.
func backfillFormulaFields(env, formula map[string]any) {
	spec := env["spec"].(map[string]any)

	// limit and having are already v5-shaped (the shape-safe migrator rewrites having),
	// so copy them across unchanged.
	if limit, ok := formula["limit"]; ok {
		spec["limit"] = limit
	}
	if having, ok := formula["having"]; ok {
		spec["having"] = having
	}

	// orderBy is still in the v4 shape ([{columnName, order}]); reshape each entry into
	// the v5 order shape ([{key: {name}, direction}]).
	orderBy, ok := formula["orderBy"].([]any)
	if !ok {
		return
	}
	order := make([]any, 0, len(orderBy))
	for _, item := range orderBy {
		ob, ok := item.(map[string]any)
		if !ok {
			continue
		}
		order = append(order, map[string]any{
			"key":       map[string]any{"name": ob["columnName"]},
			"direction": ob["order"],
		})
	}
	spec["order"] = order
}

// dropLegacyFilter removes a v4-shaped filter ({items, op}) stored under the v5
// `filter` key. The v5 filter is {expression}; the migrator only rewrites the v4
// `filters` key and skips when `filter` is present, so this stale shape would reach
// WrapInV5Envelope and fail v5 validation. The v1 UI ignores it — it types
// IBuilderQuery.filter as {expression} (frontend queryBuilderData.ts, filter?: Filter)
// and only ever reads filter.expression, so items/op go unread. We drop it before the
// migrator, which can then rebuild `filter` from `filters` if present.
func dropLegacyFilter(query map[string]any) {
	filter, ok := query["filter"].(map[string]any)
	if !ok {
		return
	}
	_, hasItems := filter["items"]
	_, hasOp := filter["op"]
	if hasItems || hasOp {
		delete(query, "filter")
	}
}

// normalizeFilterItemOps lowercases exists/nexists filter ops (frontend stores them
// uppercase) to the spelling transition's buildCondition (pkg/transition/migrate_common.go)
// matches; otherwise it appends a spurious empty value ("svc EXISTS ”"). Value
// operators already round-trip via that switch's default case.
func normalizeFilterItemOps(query map[string]any) {
	filters, ok := query["filters"].(map[string]any)
	if !ok {
		return
	}
	items, ok := filters["items"].([]any)
	if !ok {
		return
	}
	for _, it := range items {
		item, ok := it.(map[string]any)
		if !ok {
			continue
		}
		op, ok := item["op"].(string)
		if !ok {
			continue
		}
		switch strings.ToLower(strings.ReplaceAll(op, "_", " ")) {
		case "exists":
			item["op"] = "exists"
		case "nexists", "not exists":
			item["op"] = "nexists"
		}
	}
}

// metricAggregationFields are the JSON keys a metric aggregation accepts (see
// MetricAggregation). The decoder is strict, so any other key (e.g. a logs/traces
// style `expression`) is rejected as an unknown field.
var metricAggregationFields = map[string]bool{
	"metricName":                      true,
	"temporality":                     true,
	"timeAggregation":                 true,
	"spaceAggregation":                true,
	"comparisonSpaceAggregationParam": true,
	"reduceTo":                        true,
}

// normalizeMetricAggregations reshapes a metric query's aggregations to the shape v5
// expects. v1 bodies sometimes carry a logs/traces-style aggregation ({expression});
// the frontend ignores expression for metrics and builds from the metric fields
// (createAggregation, prepareQueryRangePayloadV5.ts), so we drop every non-metric
// key. A dropped expression leaves metricName empty and the widget is skipped later
// (isUnrenderableMetricQuery), matching what v1 renders.
//
// It also defaults an invalid spaceAggregation to "sum": v1 bodies often leave it
// empty or carry a stale value, which fails validation (SpaceAggregation.IsValid). A
// valid value (including a histogram percentile) is left alone; the metric type isn't
// in the body, so we can't prefer a percentile default for histograms.
func normalizeMetricAggregations(query map[string]any) {
	if signalFromDataSource(query["dataSource"]) != telemetrytypes.SignalMetrics {
		return
	}
	aggs, ok := query["aggregations"].([]any)
	if !ok {
		return
	}
	for _, a := range aggs {
		agg, ok := a.(map[string]any)
		if !ok {
			continue
		}
		for k := range agg {
			if !metricAggregationFields[k] {
				delete(agg, k)
			}
		}
		sa, _ := agg["spaceAggregation"].(string)
		if !(metrictypes.SpaceAggregation{String: valuer.NewString(sa)}).IsValid() {
			agg["spaceAggregation"] = metrictypes.SpaceAggregationSum.StringValue()
		}
	}
}

// foldReduceToIntoMetricAggregations moves a metric query's top-level reduceTo onto
// its existing aggregations[] (where v5 wants it), which the shared migrator only does
// when building an aggregation from flat fields. Runs before it so the value survives.
func foldReduceToIntoMetricAggregations(query map[string]any) {
	if signalFromDataSource(query["dataSource"]) != telemetrytypes.SignalMetrics {
		return
	}
	reduceTo, ok := query["reduceTo"].(string)
	if !ok || reduceTo == "" {
		return
	}
	aggs, ok := query["aggregations"].([]any)
	if !ok || len(aggs) == 0 {
		return
	}
	for _, a := range aggs {
		agg, ok := a.(map[string]any)
		if !ok {
			continue
		}
		if _, exists := agg["reduceTo"]; !exists {
			agg["reduceTo"] = reduceTo
		}
	}
}

// ensureMetricReduceTo fills a metric aggregation's reduceTo on scalar panels, which
// reject one without it (QueryBuilderQuery.Validate) where v1 never required it. The
// shared migrator only derives a reduceTo for v3-shaped table widgets, so value/pie
// panels and bodies already carrying aggregations[] arrive empty. A valid reduceTo is
// left alone.
func ensureMetricReduceTo(query map[string]any, panelKind PanelPluginKind) {
	if requestTypeForPanel(panelKind) != qb.RequestTypeScalar {
		return
	}
	if signalFromDataSource(query["dataSource"]) != telemetrytypes.SignalMetrics {
		return
	}
	aggs, ok := query["aggregations"].([]any)
	if !ok {
		return
	}
	for _, a := range aggs {
		agg, ok := a.(map[string]any)
		if !ok {
			continue
		}
		reduceTo, _ := agg["reduceTo"].(string)
		if (qb.ReduceTo{String: valuer.NewString(reduceTo)}).IsValid() {
			continue
		}
		agg["reduceTo"] = deriveReduceToForMetricAggregation(agg).StringValue()
	}
}

// deriveReduceToForMetricAggregation reads the metric's kind off its aggregation: a
// percentile space aggregation is a histogram, a rate/increase time aggregation is a
// counter, anything else a gauge.
func deriveReduceToForMetricAggregation(agg map[string]any) qb.ReduceTo {
	spaceAgg, _ := agg["spaceAggregation"].(string)
	if (metrictypes.SpaceAggregation{String: valuer.NewString(spaceAgg)}).IsPercentile() {
		return qb.ReduceToAvg
	}
	timeAgg, _ := agg["timeAggregation"].(string)
	switch (metrictypes.TimeAggregation{String: valuer.NewString(timeAgg)}) {
	case metrictypes.TimeAggregationRate, metrictypes.TimeAggregationIncrease:
		return qb.ReduceToSum
	}
	return qb.ReduceToLast
}

// normalizePreV5LogTraceAggregations reshapes an existing logs/traces aggregations[]
// via parseAggregations (extract func(args), lift inline "as alias", split
// multi-part, drop metric-only fields; empty → count()). Covers the case the
// migrator skips: it builds from flat fields but leaves a present-but-malformed
// aggregations[] alone. A query with none is left as-is.
func normalizePreV5LogTraceAggregations(query map[string]any) {
	switch signalFromDataSource(query["dataSource"]) {
	case telemetrytypes.SignalLogs, telemetrytypes.SignalTraces:
	default:
		return
	}
	aggs, ok := query["aggregations"].([]any)
	if !ok || len(aggs) == 0 {
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

// ensureDefaultAggregation defaults an empty logs/traces aggregations[] to count(),
// mirroring the frontend. Callers gate this to aggregation panels. Metrics are skipped:
// count() can't stand in for a missing metricName.
func ensureDefaultAggregation(query map[string]any) {
	switch signalFromDataSource(query["dataSource"]) {
	case telemetrytypes.SignalLogs, telemetrytypes.SignalTraces:
	default:
		return
	}
	if aggs, ok := query["aggregations"].([]any); ok && len(aggs) > 0 {
		return
	}
	query["aggregations"] = []any{map[string]any{"expression": "count()"}}
}

// aggExprRe matches one "func(args)" with an optional "as alias". Mirrors the
// frontend's parseAggregations regex; matching only well-formed func(args)
// discards trailing junk ("sum(x) ) )" → "sum(x)").
var aggExprRe = regexp.MustCompile(`([a-zA-Z0-9_]+\([^)]*\))(?:\s*as\s+('[^']*'|"[^"]*"|[a-zA-Z0-9_-]+))?`)

// aggExprNestedRe is a backup for aggExprRe that tolerates one level of nested
// parens in args (rate(count())). HACK: the flat aggExprRe (and the frontend it
// mirrors) truncates such exprs to an unbalanced "rate(count()"; the UI fails
// these today, so this is best-effort beyond v1. Tried only when the flat match
// comes back unbalanced.
var aggExprNestedRe = regexp.MustCompile(`([a-zA-Z0-9_]+\((?:[a-zA-Z0-9_]+\([^()]*\)|[^()])*\))(?:\s*as\s+('[^']*'|"[^"]*"|[a-zA-Z0-9_-]+))?`)

// parseAggregations pulls every func(args) (with inline or passed-through alias,
// quotes stripped) out of a v1 expression. Mirrors the frontend's
// parseAggregations; empty result if none.
func parseAggregations(expression, availableAlias string) []any {
	matches := aggExprRe.FindAllStringSubmatch(expression, -1)
	if hasUnbalancedParens(matches) {
		matches = aggExprNestedRe.FindAllStringSubmatch(expression, -1)
	}
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

// hasUnbalancedParens reports whether any matched expression has mismatched
// parens — the signature of aggExprRe truncating a nested expr ("rate(count()").
func hasUnbalancedParens(matches [][]string) bool {
	for _, m := range matches {
		if strings.Count(m[1], "(") != strings.Count(m[1], ")") {
			return true
		}
	}
	return false
}

// normalizePreV5SelectColumns / normalizePreV5GroupBy let WrapInV5Envelope (which
// reads the old {key,dataType,type}) handle selectColumns/groupBy stored the v5 way
// ({name,…}) — see backfillPreV5FieldKeys. Inverse of normalizePreV5FieldKeys (the
// two consumers want opposite shapes).
func normalizePreV5SelectColumns(query map[string]any) {
	if cols, ok := query["selectColumns"].([]any); ok {
		query["selectColumns"] = backfillPreV5FieldKeys(cols)
	}
}

func normalizePreV5GroupBy(query map[string]any) {
	if gb, ok := query["groupBy"].([]any); ok {
		query["groupBy"] = backfillPreV5FieldKeys(gb)
	}
}

// backfillPreV5FieldKeys copies v5 field names (name/fieldDataType/fieldContext)
// down to their v4 equivalents (key/dataType/type) so WrapInV5Envelope, which reads
// the v4 names, sees a field stored the v5 way. Fields with no resolvable key are
// dropped.
func backfillPreV5FieldKeys(fields []any) []any {
	out := make([]any, 0, len(fields))
	for _, f := range fields {
		field, ok := f.(map[string]any)
		if !ok {
			continue
		}
		if _, ok := field["key"]; !ok {
			if name, ok := field["name"]; ok {
				field["key"] = name
			}
		}
		if _, ok := field["dataType"]; !ok {
			if fdt, ok := field["fieldDataType"]; ok {
				field["dataType"] = fdt
			}
		}
		if _, ok := field["type"]; !ok {
			if fc, ok := field["fieldContext"]; ok {
				field["type"] = fc
			}
		}
		if key, _ := field["key"].(string); key == "" {
			continue
		}
		out = append(out, field)
	}
	return out
}

// normalizePreV5FieldKeys renames list-panel field keys {key,dataType,type} →
// {name,fieldDataType,fieldContext} in place (as WrapInV5Envelope does for
// groupBy/orderBy). Entries already carrying "name" are left as-is.
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

// normalizePreV5PageSize backfills limit from the legacy pageSize (frontend's
// `limit || pageSize`), for row-limited panels (list/table) only. Leaves a query
// that already has limit, or a non-row-limited panel, untouched.
func normalizePreV5PageSize(query map[string]any, rowLimitPanel bool) {
	if !rowLimitPanel {
		return
	}
	if limit, ok := query["limit"]; ok && limit != nil {
		return
	}
	if ps, ok := query["pageSize"]; ok {
		query["limit"] = ps
	}
}

// normalizeQueryLimit coerces limit to the int the v5 decode expects: v1 stored it
// as a string ("5") or float, both of which fail the typed decode. An unparseable
// value or one above the v5 maximum (MaxQueryLimit) is dropped, leaving the query
// unlimited (the field is optional).
func normalizeQueryLimit(query map[string]any) {
	if query["limit"] == nil {
		return
	}
	limit, ok := coerceFloat(query["limit"])
	if !ok || limit > qb.MaxQueryLimit {
		delete(query, "limit")
		return
	}
	query["limit"] = int(limit)
}

// normalizeQueryOffset coerces offset to the int the v5 decode expects; v1 could
// store it as a string. An unparseable value is dropped (offset defaults to 0).
func normalizeQueryOffset(query map[string]any) {
	if query["offset"] == nil {
		return
	}
	offset, ok := coerceFloat(query["offset"])
	if !ok {
		delete(query, "offset")
		return
	}
	query["offset"] = int(offset)
}
