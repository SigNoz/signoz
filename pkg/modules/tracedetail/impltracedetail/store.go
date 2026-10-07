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
	flagger        flagger.Flagger
	tracesStorage  qbtypes.Storage
}

func NewTraceStore(ts telemetrystore.TelemetryStore, metadataStore telemetrytypes.MetadataStore, fl flagger.Flagger) *traceStore {
	return &traceStore{telemetryStore: ts, metadataStore: metadataStore, flagger: fl, tracesStorage: tracestelemetryschema.NewStorage()}
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
		"DISTINCT ON (span_id) timestamp", "duration_nano", "span_id", "has_error", "kind",
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

func (s *traceStore) GetThreadSpans(ctx context.Context, orgID valuer.UUID, traceID string, summary *spantypes.TraceSummary, page spantypes.ThreadPage) ([]spantypes.StorableSpan, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"DISTINCT ON (span_id) timestamp", "duration_nano", "span_id", "parent_span_id", "has_error", "name", "kind_string",
		"status_code_string", "status_message", "resources_string",
		"attributes_string", "attributes_number", "attributes_bool", "attributes",
		"events", "links as references",
	)
	sb.From(fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceTable))
	hasMessages, err := s.messagesExistCondition(ctx, orgID, summary, sb)
	if err != nil {
		return nil, err
	}
	sb.Where(
		sb.E("trace_id", traceID),
		sb.GE("ts_bucket_start", summary.Start.Unix()-1800),
		sb.LE("ts_bucket_start", summary.End.Unix()),
		hasMessages,
	)
	if cursor := page.Cursor; cursor != nil {
		// ClickHouse can't use an index for a tuple comparison, so the separate timestamp and
		// ts_bucket_start bounds are what skip the data on the far side of the cursor.
		key := "(toUnixTimestamp64Nano(timestamp), span_id)"
		bucket := int64(cursor.TimeUnixNano / uint64(time.Second))
		timestamp := fmt.Sprintf("fromUnixTimestamp64Nano(toInt64(%s))", sb.Var(cursor.TimeUnixNano))
		tuple := sqlbuilder.Tuple(cursor.TimeUnixNano, cursor.SpanID)
		switch page.From {
		case spantypes.ThreadBefore:
			sb.Where(sb.LE("ts_bucket_start", bucket), "timestamp <= "+timestamp, sb.LT(key, tuple))
		case spantypes.ThreadAt:
			sb.Where(sb.GE("ts_bucket_start", bucket-1800), "timestamp >= "+timestamp, sb.GE(key, tuple))
		default:
			sb.Where(sb.GE("ts_bucket_start", bucket-1800), "timestamp >= "+timestamp, sb.GT(key, tuple))
		}
	}
	// span_id breaks timestamp ties so the order matches the cursor key; otherwise tied spans
	// can be skipped or repeated across pages.
	if page.From == spantypes.ThreadBefore {
		sb.OrderByDesc("timestamp")
		sb.OrderByDesc("span_id")
	} else {
		sb.OrderByAsc("timestamp")
		sb.OrderByAsc("span_id")
	}
	sb.Limit(page.Limit)
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var spans []spantypes.StorableSpan
	if err := s.telemetryStore.ClickhouseDB().Select(ctx, &spans, query, args...); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying thread spans")
	}
	return spans, nil
}

// messagesExistCondition resolves the gen_ai message keys through the attribute evolution metadata
// and the use_trace_attributes_json flag, so the filter reads the same columns the query builder does.
func (s *traceStore) messagesExistCondition(ctx context.Context, orgID valuer.UUID, summary *spantypes.TraceSummary, sb *sqlbuilder.SelectBuilder) (string, error) {
	names := []string{aiobservabilitytypes.GenAIInputMessages, aiobservabilitytypes.GenAIOutputMessages}
	selectors := make([]*telemetrytypes.FieldKeySelector, len(names))
	for i, name := range names {
		selectors[i] = &telemetrytypes.FieldKeySelector{
			StartUnixMilli:    summary.Start.UnixMilli(),
			EndUnixMilli:      summary.End.UnixMilli(),
			Signal:            telemetrytypes.SignalTraces,
			FieldContext:      telemetrytypes.FieldContextAttribute,
			Name:              name,
			SelectorMatchType: telemetrytypes.FieldSelectorMatchTypeExact,
		}
	}
	fieldKeys, _, err := s.metadataStore.GetKeysMulti(ctx, orgID, selectors)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error fetching thread field keys")
	}

	q := querybuilder.NewQueryInfo(ctx, orgID, s.flagger, telemetrytypes.SignalTraces, nil, uint64(summary.Start.UnixNano()), uint64(summary.End.UnixNano()))
	conds := make([]string, 0, len(names))
	for _, name := range names {
		key := &telemetrytypes.TelemetryFieldKey{Name: name, Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute}
		keyConds, _, err := querybuilder.Conditions(ctx, q, s.tracesStorage, key, qbtypes.FilterOperatorExists, nil, fieldKeys, false, sb)
		if err != nil {
			return "", err
		}
		conds = append(conds, keyConds...)
	}
	return sb.Or(conds...), nil
}

func (s *traceStore) GetThreadCursor(ctx context.Context, traceID string, summary *spantypes.TraceSummary, spanID string) (*spantypes.ThreadCursor, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("toUnixTimestamp64Nano(timestamp)")
	sb.From(fmt.Sprintf("%s.%s", spantypes.TraceDB, spantypes.TraceTable))
	sb.Where(
		sb.E("trace_id", traceID),
		sb.GE("ts_bucket_start", summary.Start.Unix()-1800),
		sb.LE("ts_bucket_start", summary.End.Unix()),
		sb.E("span_id", spanID),
	)
	sb.Limit(1)
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var timeUnixNano int64
	if err := s.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(&timeUnixNano); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.NewNotFoundf(spantypes.ErrCodeThreadSpanNotFound, "span %s not found in trace %s", spanID, traceID)
		}
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying thread span")
	}
	return &spantypes.ThreadCursor{TimeUnixNano: uint64(timeUnixNano), SpanID: spanID}, nil
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
