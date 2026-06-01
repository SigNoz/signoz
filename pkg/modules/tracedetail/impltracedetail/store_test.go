package impltracedetail_test

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/spantypes/spantypestest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

var (
	testTraceID = "trace-abc123"
	testStart   = time.Unix(1000, 0).UTC()
	testEnd     = time.Unix(2000, 0).UTC()
	testSummary = &spantypes.TraceSummary{
		TraceID:  testTraceID,
		Start:    testStart,
		End:      testEnd,
		NumSpans: 10,
	}
	svcNameField = telemetrytypes.TelemetryFieldKey{
		Name:         "service.name",
		FieldContext: telemetrytypes.FieldContextResource,
	}
	unsupportedField = telemetrytypes.TelemetryFieldKey{
		Name:         "http.method",
		FieldContext: telemetrytypes.FieldContextSpan,
	}
)

func newTestStore(matcher sqlmock.QueryMatcher) *spantypestest.TraceStoreTest {
	ts := telemetrystoretest.New(telemetrystore.Config{}, matcher)
	return spantypestest.New(impltracedetail.NewTraceStore(ts), ts.Mock())
}

func TestGetTraceSummary(t *testing.T) {
	expectedSQL := "SELECT trace_id, min(start) AS start, max(end) AS end, sum(num_spans) AS num_spans FROM signoz_traces.distributed_trace_summary WHERE trace_id = ? GROUP BY trace_id"

	t.Run("ValidTraceID_GeneratesExpectedSQL", func(t *testing.T) {
		s := newTestStore(sqlmock.QueryMatcherRegexp)
		s.Mock().ExpectQueryRow(regexp.QuoteMeta(expectedSQL)).
			WillReturnRow(cmock.NewRow(nil, nil))
		_, _ = s.Store().GetTraceSummary(context.Background(), testTraceID)
		assert.NoError(t, s.Mock().ExpectationsWereMet())
	})
}

func TestGetMinimalSpans(t *testing.T) {
	expectedSQL := "SELECT DISTINCT ON (span_id) span_id, parent_span_id, timestamp, duration_nano, has_error, resource_string_service$$name FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? ORDER BY timestamp ASC, name ASC"

	t.Run("ValidRange_GeneratesExpectedSQL", func(t *testing.T) {
		s := newTestStore(sqlmock.QueryMatcherRegexp)
		s.Mock().ExpectSelect(regexp.QuoteMeta(expectedSQL)).
			WillReturnRows(cmock.NewRows(nil, nil))
		_, _ = s.Store().GetMinimalSpans(context.Background(), testTraceID, testStart, testEnd)
		assert.NoError(t, s.Mock().ExpectationsWereMet())
	})
}

func TestGetSpanCountByField(t *testing.T) {
	expectedSQL := "SELECT resource.`service.name`::String AS field_value, count(DISTINCT span_id) AS count FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND notEmpty(resource.`service.name`::String) GROUP BY field_value"

	tests := []struct {
		name      string
		field     telemetrytypes.TelemetryFieldKey
		wantQuery bool
	}{
		{name: "ResourceField_GeneratesExpectedSQL", field: svcNameField, wantQuery: true},
		{name: "NonResourceField_NoSQLGenerated", field: unsupportedField},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherRegexp)
			if tc.wantQuery {
				s.Mock().ExpectSelect(regexp.QuoteMeta(expectedSQL)).
					WillReturnRows(cmock.NewRows(nil, nil))
			}
			_, _ = s.Store().GetSpanCountByField(context.Background(), testTraceID, testSummary, tc.field)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}

func TestGetSpanDurationByField(t *testing.T) {

	expectedSQL := "WITH all_spans AS (SELECT DISTINCT ON (span_id) resource.`service.name`::String AS field_value, toUnixTimestamp64Nano(timestamp) AS start_ns, start_ns + duration_nano AS end_ns FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND notEmpty(field_value) ORDER BY timestamp ASC, name ASC), effective_start AS (SELECT field_value, end_ns, greatest(start_ns, ifNull(max(end_ns) OVER (PARTITION BY field_value ORDER BY start_ns ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), toUInt64(0))) AS effective_start_ns FROM all_spans) SELECT field_value, sum(toUInt64(greatest(end_ns - effective_start_ns, 0))) AS total_ns FROM effective_start GROUP BY field_value"

	tests := []struct {
		name      string
		field     telemetrytypes.TelemetryFieldKey
		wantQuery bool
	}{
		{name: "ResourceField_GeneratesExpectedSQL", field: svcNameField, wantQuery: true},
		{name: "NonResourceField_NoSQLGenerated", field: unsupportedField},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherRegexp)
			if tc.wantQuery {
				s.Mock().ExpectSelect(regexp.QuoteMeta(expectedSQL)).
					WillReturnRows(cmock.NewRows(nil, nil))
			}
			_, _ = s.Store().GetSpanDurationByField(context.Background(), testTraceID, testSummary, tc.field)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}
