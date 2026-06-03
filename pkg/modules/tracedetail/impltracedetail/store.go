package impltracedetail

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	sqlbuilder "github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const colServiceName = `resource_string_service$$$$name` // $ gets escaped so $$$$ converts to $$.

func buildFieldExpr(fieldKey telemetrytypes.TelemetryFieldKey) (string, error) {
	switch fieldKey.FieldContext {
	case telemetrytypes.FieldContextResource:
		// String cast required — Variant/Dynamic is rejected by GROUP BY.
		return fmt.Sprintf("resource.`%s`::String", fieldKey.Name), nil
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
}

func NewTraceStore(ts telemetrystore.TelemetryStore) *traceStore {
	return &traceStore{telemetryStore: ts}
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
