package dashboardtypes

import (
	"context"
	"log/slog"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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
	preV5Migrator.MigrateQueryDataShapeSafe(context.Background(), query, widgetType)
	normalizePreV5LogTraceAggregations(query)
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

// normalizePreV5SelectColumns lets WrapInV5Envelope (which reads the old
// {key,dataType,type}) handle selectColumns stored the v5 way ({name,…}): backfill
// key/dataType/type from name/fieldDataType/fieldContext, drop columns with no
// resolvable key. Inverse of normalizePreV5FieldKeys (the two consumers want
// opposite shapes).
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
