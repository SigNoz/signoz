package impltracedetail

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	sqlbuilder "github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/clickhousesql"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const colServiceName = `resource_string_service$$$$name` // $ gets escaped so $$$$ converts to $$.

func buildFieldExpr(fieldKey telemetrytypes.TelemetryFieldKey) (string, error) {
	switch fieldKey.FieldContext {
	case telemetrytypes.FieldContextResource:
		// String cast required — Variant/Dynamic is rejected by GROUP BY.
		return sqlbuilder.Escape(fmt.Sprintf("resource.%s::String", clickhousesql.Identifier(fieldKey.Name))), nil
	}
	return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported field context: %v", fieldKey.FieldContext)
}

type spanCountRow struct {
	FieldValue string `ch:"field_value"`
	Count      uint64 `ch:"count"`
}

type spanDurationRow struct {
	FieldValue string `ch:"field_value"`
	TotalNs    uint64 `ch:"total_ns"`
}

type traceStore struct {
	telemetryStore telemetrystore.TelemetryStore
	metadataStore  telemetrytypes.MetadataStore
	storage        qbtypes.Storage
	flagger        flagger.Flagger
}

func NewTraceStore(ts telemetrystore.TelemetryStore, metadataStore telemetrytypes.MetadataStore, fl flagger.Flagger) *traceStore {
	return &traceStore{
		telemetryStore: ts,
		metadataStore:  metadataStore,
		storage:        tracestelemetryschema.NewStorage(),
		flagger:        fl,
	}
}

func (s *traceStore) GetTraceSummary(ctx context.Context, traceID string) (*spantypes.TraceSummary, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("trace_id", "min(start) AS start", "max(end) AS end", "sum(num_spans) AS num_spans")
	sb.From(fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceSummaryTable))
	sb.Where(sb.E("trace_id", traceID))
	sb.GroupBy("trace_id")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var summary spantypes.TraceSummary
	err := s.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(
		&summary.TraceID, &summary.Start, &summary.End, &summary.NumSpans,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, spantypes.ErrTraceNotFound
		}
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying trace summary")
	}
	return &summary, nil
}

func (s *traceStore) GetTraceStats(ctx context.Context, orgID valuer.UUID, traceID string, summary *spantypes.TraceSummary) (*spantypes.TraceStats, error) {
	table := fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceTable)
	spans := sqlbuilder.NewSelectBuilder()

	genAIColumns, err := s.genAISpanColumns(ctx, orgID, summary, spans)
	if err != nil {
		return nil, err
	}

	// A span whose parent was never recorded hangs off a synthetic "Missing Span" root in the waterfall.
	ids := sqlbuilder.NewSelectBuilder()
	ids.Select("span_id")
	ids.From(table)
	ids.Where(
		ids.E("trace_id", traceID),
		ids.GE("ts_bucket_start", summary.Start.Unix()-1800),
		ids.LE("ts_bucket_start", summary.End.Unix()),
	)
	missingParent := fmt.Sprintf("parent_span_id <> '' AND parent_span_id GLOBAL NOT IN (%s)", spans.Var(ids))

	spans.Select(
		"toUnixTimestamp64Nano(timestamp) AS span_start_ns",
		"span_start_ns + duration_nano AS span_end_ns",
		"span_id",
		"has_error",
		"("+missingParent+") AS has_missing_parent",
		"(parent_span_id = '' OR has_missing_parent) AS is_root",
		"if(parent_span_id = '', name, 'Missing Span') AS root_name",
		"if(parent_span_id = '', "+colServiceName+", '') AS root_service",
	)
	spans.SelectMore(genAIColumns...)
	spans.From(table)
	spans.Where(
		spans.E("trace_id", traceID),
		spans.GE("ts_bucket_start", summary.Start.Unix()-1800),
		spans.LE("ts_bucket_start", summary.End.Unix()),
	)
	spans.SQL("LIMIT 1 BY span_id")

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"toUInt64(min(span_start_ns)) AS start_ns",
		"toUInt64(max(span_end_ns)) AS end_ns",
		"count() AS total_spans",
		"countIf(has_error) AS total_error_spans",
		"countIf(has_missing_parent) > 0 AS has_missing_spans",
		"argMinIf(root_service, (span_start_ns, root_name), is_root) AS root_service_name",
		"argMinIf(root_name, (span_start_ns, root_name), is_root) AS root_entry_point",
		"countIf(is_gen_ai) AS gen_ai_span_count",
		"toUInt64(coalesce(sum(input_tokens_value), 0)) AS input_tokens",
		"toUInt64(coalesce(sum(output_tokens_value), 0)) AS output_tokens",
		"toUInt64(coalesce(sum(cache_read_tokens_value), 0)) AS cache_read_tokens",
		"toUInt64(coalesce(sum(cache_write_tokens_value), 0)) AS cache_write_tokens",
		"toUInt64(coalesce(sum(reasoning_tokens_value), 0)) AS reasoning_tokens",
		"sum(total_cost_value) AS total_cost",
	)
	sb.From(sb.BuilderAs(spans, "spans"))
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var stats spantypes.TraceStats
	err = s.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(
		&stats.StartNs, &stats.EndNs, &stats.TotalSpans, &stats.TotalErrorSpans, &stats.HasMissingSpans,
		&stats.RootServiceName, &stats.RootEntryPoint, &stats.GenAISpanCount,
		&stats.Tokens.Input, &stats.Tokens.Output, &stats.Tokens.CacheRead, &stats.Tokens.CacheWrite, &stats.Tokens.Reasoning,
		&stats.TotalCost,
	)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying trace stats")
	}
	return &stats, nil
}

// genAISpanColumns renders the per-span gen_ai gate and value reads through the shared
// traces storage, so each attribute is read from the column its evolutions place it in
// over the trace's own time window. Exists predicates bind their args into sb.
func (s *traceStore) genAISpanColumns(ctx context.Context, orgID valuer.UUID, summary *spantypes.TraceSummary, sb *sqlbuilder.SelectBuilder) ([]string, error) {
	// no data type: metadata reports token counts as number, so a float64 request would
	// miss them and fall back to a map read without evolutions
	attributeKey := func(name string) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{Name: name, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute}
	}

	selectors := make([]*telemetrytypes.FieldKeySelector, 0, len(aiobservabilitytypes.GenAISpanGateKeys)+len(spantypes.TraceStatsGenAIColumns))
	addSelector := func(name string) {
		selectors = append(selectors, &telemetrytypes.FieldKeySelector{
			Name:              name,
			Signal:            telemetrytypes.SignalTraces,
			FieldContext:      telemetrytypes.FieldContextAttribute,
			SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
		})
	}
	for _, name := range aiobservabilitytypes.GenAISpanGateKeys {
		addSelector(name)
	}
	for _, col := range spantypes.TraceStatsGenAIColumns {
		addSelector(col.Key)
	}
	keys, _, err := s.metadataStore.GetKeysMulti(ctx, orgID, querybuilder.ExpandKeySelectorsForFamilies(ctx, orgID, s.flagger, selectors))
	if err != nil {
		return nil, err
	}

	q := querybuilder.NewQueryInfo(ctx, orgID, s.flagger, telemetrytypes.SignalTraces, nil, uint64(summary.Start.UnixNano()), uint64(summary.End.UnixNano()))

	gate := make([]string, 0, len(aiobservabilitytypes.GenAISpanGateKeys))
	for _, name := range aiobservabilitytypes.GenAISpanGateKeys {
		conds, _, err := querybuilder.Conditions(ctx, q, s.storage, attributeKey(name), qbtypes.FilterOperatorExists, nil, keys, false, sb)
		if err != nil {
			return nil, err
		}
		gate = append(gate, conds...)
	}
	columns := []string{sb.Or(gate...) + " AS is_gen_ai"}

	for _, col := range spantypes.TraceStatsGenAIColumns {
		expr, err := querybuilder.ResolveColumn(ctx, q, s.storage, attributeKey(col.Key), telemetrytypes.FieldDataTypeFloat64, keys)
		if err != nil {
			return nil, err
		}
		// a materialized column name carries `$$`, which Build would otherwise unescape
		columns = append(columns, sqlbuilder.Escape(expr)+" AS "+col.Column+"_value")
	}
	return columns, nil
}

func (s *traceStore) GetTraceSpans(ctx context.Context, traceID string, summary *spantypes.TraceSummary) ([]spantypes.StorableSpan, error) {
	// DISTINCT ON (span_id) is ClickHouse-specific syntax not supported by sqlbuilder
	query := fmt.Sprintf(`
		SELECT DISTINCT ON (span_id)
			timestamp, duration_nano, span_id, has_error, kind,
			resource_string_service$$name, name,
			attributes_string, attributes_number, attributes_bool, resources_string,
			events, status_message, status_code_string, kind_string, parent_span_id,
			flags, is_remote, trace_state, status_code,
			db_name, db_operation, http_method, http_url, http_host,
			external_http_method, external_http_url, response_status_code, links as references
		FROM %s.%s
		WHERE trace_id=? AND ts_bucket_start>=? AND ts_bucket_start<=?
		ORDER BY timestamp ASC, name ASC`,
		spantypes.TraceDB, spantypes.TraceTable,
	)
	var spanItems []spantypes.StorableSpan
	err := s.telemetryStore.ClickhouseDB().Select(
		ctx, &spanItems, query,
		traceID,
		summary.Start.Unix()-1800,
		summary.End.Unix(),
	)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying trace spans")
	}
	return spanItems, nil
}

func (s *traceStore) GetMinimalSpans(ctx context.Context, traceID string, start, end time.Time) ([]spantypes.MinimalSpan, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"DISTINCT ON (span_id) span_id",
		"parent_span_id", "timestamp", "duration_nano", "has_error",
		colServiceName,
	)
	sb.From(fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceTable))
	sb.Where(
		sb.E("trace_id", traceID),
		sb.GE("ts_bucket_start", start.Unix()-1800),
		sb.LE("ts_bucket_start", end.Unix()),
	)
	sb.OrderByAsc("timestamp")
	sb.OrderByAsc("name")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var spans []spantypes.MinimalSpan
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &spans, query, args...); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying minimal spans")
	}
	return spans, nil
}

func (s *traceStore) GetTraceSpansByIDs(ctx context.Context, traceID string, start, end time.Time, spanIDs []string) ([]spantypes.StorableSpan, error) {
	if len(spanIDs) == 0 {
		return []spantypes.StorableSpan{}, nil
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"DISTINCT ON (span_id) timestamp",
		"duration_nano", "span_id", "has_error", "kind",
		colServiceName, "name",
		"attributes_string", "attributes_number", "attributes_bool", "resources_string",
		"events", "status_message", "status_code_string", "kind_string", "parent_span_id",
		"flags", "is_remote", "trace_state", "status_code",
		"db_name", "db_operation", "http_method", "http_url", "http_host",
		"external_http_method", "external_http_url", "response_status_code", "links as references",
	)
	sb.From(fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceTable))
	ids := make([]any, len(spanIDs))
	for i, id := range spanIDs {
		ids[i] = id
	}
	sb.Where(
		sb.E("trace_id", traceID),
		sb.In("span_id", ids...),
		sb.GE("ts_bucket_start", start.Unix()-1800),
		sb.LE("ts_bucket_start", end.Unix()),
	)
	sb.OrderByAsc("timestamp")
	sb.OrderByAsc("name")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var spans []spantypes.StorableSpan
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &spans, query, args...); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying trace spans by IDs")
	}
	return spans, nil
}

func (s *traceStore) GetFlamegraphSpans(ctx context.Context, traceID string, start, end time.Time, spanIDs []string) ([]spantypes.StorableSpan, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"span_id",
		"any(parent_span_id) AS parent_span_id",
		"any(timestamp) AS timestamp",
		"any(duration_nano) AS duration_nano",
		"any(has_error) AS has_error",
		"any(name) AS name",
		"any(events) AS events",
		"any(attributes_string) AS attributes_string",
		"any(attributes_number) AS attributes_number",
		"any(attributes_bool) AS attributes_bool",
		"any(resources_string) AS resources_string",
	)
	sb.From(fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceTable))
	conditions := []string{
		sb.E("trace_id", traceID),
		sb.GE("ts_bucket_start", start.Unix()-1800),
		sb.LE("ts_bucket_start", end.Unix()),
	}
	if len(spanIDs) > 0 {
		ids := make([]any, len(spanIDs))
		for i, id := range spanIDs {
			ids[i] = id
		}
		conditions = append(conditions, sb.In("span_id", ids...))
	}
	sb.Where(conditions...)
	sb.GroupBy("span_id")
	sb.OrderByAsc("timestamp")
	sb.OrderByAsc("name")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var spans []spantypes.StorableSpan
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &spans, query, args...); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying flamegraph spans")
	}
	return spans, nil
}

func (s *traceStore) GetSpanCountByField(ctx context.Context, traceID string, summary *spantypes.TraceSummary, fieldKey telemetrytypes.TelemetryFieldKey) (map[string]uint64, error) {
	fieldExpr, err := buildFieldExpr(fieldKey)
	if err != nil {
		return nil, err
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(fieldExpr+" AS field_value", "count(DISTINCT span_id) AS count")
	sb.From(fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceTable))
	sb.Where(
		sb.E("trace_id", traceID),
		sb.GE("ts_bucket_start", summary.Start.Unix()-1800),
		sb.LE("ts_bucket_start", summary.End.Unix()),
		"notEmpty("+fieldExpr+")",
	)
	sb.GroupBy("field_value")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var rows []spanCountRow
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &rows, query, args...); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying span count by field")
	}
	result := make(map[string]uint64, len(rows))
	for _, r := range rows {
		result[r.FieldValue] = r.Count
	}
	return result, nil
}

func (s *traceStore) GetSpanDurationByField(ctx context.Context, traceID string, summary *spantypes.TraceSummary, fieldKey telemetrytypes.TelemetryFieldKey) (map[string]uint64, error) {
	fieldExpr, err := buildFieldExpr(fieldKey)
	if err != nil {
		return nil, err
	}

	// CTE 1: all span with start and end timestamps.
	allSpansSB := sqlbuilder.NewSelectBuilder()
	allSpansSB.Select(
		"DISTINCT ON (span_id) "+fieldExpr+" AS field_value",
		"toUnixTimestamp64Nano(timestamp) AS start_ns",
		"start_ns + duration_nano AS end_ns",
	)
	allSpansSB.From(fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceTable))
	allSpansSB.Where(
		allSpansSB.E("trace_id", traceID),
		allSpansSB.GE("ts_bucket_start", summary.Start.Unix()-1800),
		allSpansSB.LE("ts_bucket_start", summary.End.Unix()),
		"notEmpty(field_value)",
	)
	allSpansSB.OrderByAsc("timestamp")
	allSpansSB.OrderByAsc("name")

	// CTE 2: find max end time of all preceding spans.
	effectiveStartSB := sqlbuilder.NewSelectBuilder()
	effectiveStartSB.Select(
		"field_value", "end_ns",
		"greatest(start_ns, ifNull(max(end_ns) OVER (PARTITION BY field_value ORDER BY start_ns ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), toUInt64(0))) AS effective_start_ns",
	)
	effectiveStartSB.From("all_spans")

	// Final SELECT: each span contributes only the tail past its effective start.
	sb := sqlbuilder.With(
		sqlbuilder.CTEQuery("all_spans").As(allSpansSB),
		sqlbuilder.CTEQuery("effective_start").As(effectiveStartSB),
	).Select(
		"field_value",
		"sum(toUInt64(greatest(end_ns - effective_start_ns, 0))) AS total_ns",
	)
	sb.From("effective_start")
	sb.GroupBy("field_value")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	var rows []spanDurationRow
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &rows, query, args...); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying span duration by field")
	}
	result := make(map[string]uint64, len(rows))
	for _, r := range rows {
		result[r.FieldValue] = r.TotalNs
	}
	return result, nil
}
