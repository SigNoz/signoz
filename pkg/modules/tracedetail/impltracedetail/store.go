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
)

const colServiceName = `resource_string_service$$$$name` // $ gets escaped so $$$$ converts to $$.

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
			external_http_method, external_http_url, response_status_code
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
		"external_http_method", "external_http_url", "response_status_code",
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
