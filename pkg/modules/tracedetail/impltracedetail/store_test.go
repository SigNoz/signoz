package impltracedetail_test

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/modules/tracedetail/impltracedetail"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/types/spantypes/spantypestest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	cmock "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
	expectedSQL := `
		SELECT trace_id, min(start) AS start, max(end) AS end, sum(num_spans) AS num_spans
		FROM signoz_traces.distributed_trace_summary WHERE trace_id = ?
		GROUP BY trace_id`

	summaryCols := []cmock.ColumnType{
		{Name: "trace_id", Type: "String"},
		{Name: "start", Type: "DateTime64(9)"},
		{Name: "end", Type: "DateTime64(9)"},
		{Name: "num_spans", Type: "UInt64"},
	}

	tests := []struct {
		name      string
		setupMock func(cmock.ClickConnMockCommon)
		wantErr   error
	}{
		{
			name: "ValidTraceID_ReturnsSummary",
			setupMock: func(m cmock.ClickConnMockCommon) {
				m.ExpectQueryRow(regexp.QuoteMeta(expectedSQL)).
					WillReturnRow(cmock.NewRow(summaryCols, []any{
						testTraceID, testStart, testEnd, uint64(5),
					}))
			},
		},
		{
			name: "NoRows_ReturnsErrTraceNotFound",
			setupMock: func(m cmock.ClickConnMockCommon) {
				m.ExpectQueryRow(regexp.QuoteMeta(expectedSQL)).
					WillReturnRow(cmock.NewRow(summaryCols, nil))
			},
			wantErr: spantypes.ErrTraceNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherRegexp)
			tc.setupMock(s.Mock())

			_, err := s.Store().GetTraceSummary(context.Background(), testTraceID)
			if tc.wantErr != nil {
				require.ErrorIs(t, err, tc.wantErr)
				return
			}
			require.NoError(t, err)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}

func TestGetMinimalSpans(t *testing.T) {
	expectedSQL := `SELECT DISTINCT ON (span_id) span_id, parent_span_id, timestamp, duration_nano, has_error, resource_string_service$$name FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? ORDER BY timestamp ASC, name ASC`

	spanCols := []cmock.ColumnType{
		{Name: "span_id", Type: "String"},
		{Name: "parent_span_id", Type: "String"},
		{Name: "timestamp", Type: "DateTime64(9)"},
		{Name: "duration_nano", Type: "UInt64"},
		{Name: "has_error", Type: "Bool"},
		{Name: "resource_string_service$$name", Type: "String"},
	}

	tests := []struct {
		name      string
		setupMock func(cmock.ClickConnMockCommon)
		wantLen   int
	}{
		{
			name: "ValidRange_ReturnSpans",
			setupMock: func(m cmock.ClickConnMockCommon) {
				m.ExpectSelect(regexp.QuoteMeta(expectedSQL)).
					WillReturnRows(cmock.NewRows(spanCols, [][]any{
						{"span-1", "", testStart, uint64(1000), false, "svc-a"},
						{"span-2", "span-1", testStart, uint64(2000), true, "svc-b"},
					}))
			},
			wantLen: 2,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherRegexp)
			tc.setupMock(s.Mock())

			got, err := s.Store().GetMinimalSpans(context.Background(), testTraceID, testStart, testEnd)
			require.NoError(t, err)
			assert.Len(t, got, tc.wantLen)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}

func TestGetSpanCountByField(t *testing.T) {
	expectedSQL := "SELECT resource.`service.name`::String AS field_value, count(DISTINCT span_id) AS count FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND notEmpty(resource.`service.name`::String) GROUP BY field_value"

	countCols := []cmock.ColumnType{
		{Name: "field_value", Type: "String"},
		{Name: "count", Type: "UInt64"},
	}

	tests := []struct {
		name      string
		field     telemetrytypes.TelemetryFieldKey
		setupMock func(cmock.ClickConnMockCommon)
		want      map[string]uint64
		wantErr   bool
	}{
		{
			name:  "ResourceField_ReturnsCountMap",
			field: svcNameField,
			setupMock: func(m cmock.ClickConnMockCommon) {
				m.ExpectSelect(regexp.QuoteMeta(expectedSQL)).
					WillReturnRows(cmock.NewRows(countCols, [][]any{
						{"svc-a", uint64(10)},
						{"svc-b", uint64(5)},
					}))
			},
			want: map[string]uint64{"svc-a": 10, "svc-b": 5},
		},
		{
			name:    "NonResourceField_ReturnsInvalidInputError",
			field:   unsupportedField,
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherRegexp)
			if tc.setupMock != nil {
				tc.setupMock(s.Mock())
			}

			got, err := s.Store().GetSpanCountByField(context.Background(), testTraceID, testSummary, tc.field)
			if tc.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.want, got)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}

func TestGetSpanDurationByField(t *testing.T) {
	expectedSQL := "WITH all_spans AS (SELECT DISTINCT ON (span_id) resource.`service.name`::String AS field_value, toUnixTimestamp64Nano(timestamp) AS start_ns, start_ns + duration_nano AS end_ns FROM signoz_traces.distributed_signoz_index_v3 WHERE trace_id = ? AND ts_bucket_start >= ? AND ts_bucket_start <= ? AND notEmpty(field_value) ORDER BY timestamp ASC, name ASC), effective_start AS (SELECT field_value, end_ns, greatest(" + `
			start_ns,
			ifNull(
				max(end_ns) OVER (
					PARTITION BY field_value
					ORDER BY start_ns
					ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
				),
				toUInt64(0)
			)
		) AS effective_start_ns FROM all_spans) SELECT field_value, sum(toUInt64(greatest(end_ns - effective_start_ns, 0))) AS total_ns FROM effective_start GROUP BY field_value`

	durationCols := []cmock.ColumnType{
		{Name: "field_value", Type: "String"},
		{Name: "total_ns", Type: "UInt64"},
	}

	tests := []struct {
		name      string
		field     telemetrytypes.TelemetryFieldKey
		setupMock func(cmock.ClickConnMockCommon)
		want      map[string]uint64
		wantErr   bool
	}{
		{
			name:  "ResourceField_ReturnsDurationMap",
			field: svcNameField,
			setupMock: func(m cmock.ClickConnMockCommon) {
				m.ExpectSelect(regexp.QuoteMeta(expectedSQL)).
					WillReturnRows(cmock.NewRows(durationCols, [][]any{
						{"svc-a", uint64(900_000_000)},
						{"svc-b", uint64(100_000_000)},
					}))
			},
			want: map[string]uint64{"svc-a": 900_000_000, "svc-b": 100_000_000},
		},
		{
			name:    "NonResourceField_ReturnsInvalidInputError",
			field:   unsupportedField,
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := newTestStore(sqlmock.QueryMatcherRegexp)
			if tc.setupMock != nil {
				tc.setupMock(s.Mock())
			}

			got, err := s.Store().GetSpanDurationByField(context.Background(), testTraceID, testSummary, tc.field)
			if tc.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.want, got)
			assert.NoError(t, s.Mock().ExpectationsWereMet())
		})
	}
}
