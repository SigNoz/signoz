package dashboardtypes

import (
	"context"
	"log/slog"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
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
func normalizePreV5QueryData(query map[string]any, widgetType string) {
	dropLegacyFilter(query)
	preV5Migrator.MigrateQueryDataShapeSafe(context.Background(), query, widgetType)
	normalizePreV5LogTraceAggregations(query)
	normalizeMetricAggregations(query)
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

// aggExprRe matches one "func(args)" with an optional "as alias". Mirrors the
// frontend's parseAggregations regex; matching only well-formed func(args)
// discards trailing junk ("sum(x) ) )" → "sum(x)").
var aggExprRe = regexp.MustCompile(`([a-zA-Z0-9_]+\([^)]*\))(?:\s*as\s+('[^']*'|"[^"]*"|[a-zA-Z0-9_-]+))?`)

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

// parseAggregations pulls every func(args) (with inline or passed-through alias,
// quotes stripped) out of a v1 expression. Mirrors the frontend's
// parseAggregations; empty result if none.
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
