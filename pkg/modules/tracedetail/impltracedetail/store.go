package impltracedetail

import (
	"context"
	"database/sql"
	"fmt"

	sqlbuilder "github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types/tracedetailtypes"
)

type traceStore struct {
	telemetryStore telemetrystore.TelemetryStore
}

func NewTraceStore(ts telemetrystore.TelemetryStore) *traceStore {
	return &traceStore{telemetryStore: ts}
}

func (s *traceStore) GetTraceSummary(ctx context.Context, traceID string) (*tracedetailtypes.TraceSummary, error) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("trace_id", "min(start) AS start", "max(end) AS end", "sum(num_spans) AS num_spans")
	sb.From(fmt.Sprintf("%s.%s", tracedetailtypes.TraceDB, tracedetailtypes.TraceSummaryTable))
	sb.Where(sb.E("trace_id", traceID))
	sb.GroupBy("trace_id")
	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	var summary tracedetailtypes.TraceSummary
	err := s.telemetryStore.ClickhouseDB().QueryRow(ctx, query, args...).Scan(
		&summary.TraceID, &summary.Start, &summary.End, &summary.NumSpans,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, tracedetailtypes.ErrTraceNotFound
		}
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "error querying trace summary")
	}
	return &summary, nil
}

func (s *traceStore) GetTraceSpans(ctx context.Context, traceID string, summary *tracedetailtypes.TraceSummary) ([]tracedetailtypes.StorableSpan, error) {
	// DISTINCT ON (span_id) is ClickHouse-specific syntax not supported by sqlbuilder
	query := fmt.Sprintf(`
		SELECT DISTINCT ON (span_id)
			timestamp, duration_nano, span_id, trace_id, has_error, kind,
			resource_string_service$$name, name, links as references,
			attributes_string, attributes_number, attributes_bool, resources_string,
			events, status_message, status_code_string, kind_string, parent_span_id,
			flags, is_remote, trace_state, status_code,
			db_name, db_operation, http_method, http_url, http_host,
			external_http_method, external_http_url, response_status_code
		FROM %s.%s
		WHERE trace_id=? AND ts_bucket_start>=? AND ts_bucket_start<=?
		ORDER BY timestamp ASC, name ASC`,
		tracedetailtypes.TraceDB, tracedetailtypes.TraceTable,
	)
	var spanItems []tracedetailtypes.StorableSpan
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
