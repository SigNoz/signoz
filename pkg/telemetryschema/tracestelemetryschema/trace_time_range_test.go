package tracestelemetryschema

import (
	"context"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	cmock "github.com/SigNoz/clickhouse-go-mock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildTraceTimeRangeQuery_UnboundedUsesUniqExact(t *testing.T) {
	query, args := buildTraceTimeRangeQuery([]string{"abc", "def"}, 0, 0)
	assert.Contains(t, query, "uniqExact(trace_id)")
	assert.NotContains(t, query, "fromUnixTimestamp64Nano")
	assert.Equal(t, []any{"abc", "def"}, args)
}

func TestBuildTraceTimeRangeQuery_BoundedPrunesOnEnd(t *testing.T) {
	query, args := buildTraceTimeRangeQuery([]string{"abc"}, 100, 200)
	assert.Contains(t, query, "uniqExact(trace_id)")
	assert.Contains(t, query, "end >= fromUnixTimestamp64Nano(?)")
	assert.Contains(t, query, "end <= fromUnixTimestamp64Nano(?)")
	assert.Equal(t, []any{"abc", int64(100), int64(200)}, args)
}

func TestPaddedWindowNanos(t *testing.T) {
	fromMS := uint64(time.Date(2026, 8, 2, 0, 0, 0, 0, time.UTC).UnixMilli())
	toMS := uint64(time.Date(2026, 8, 3, 0, 0, 0, 0, time.UTC).UnixMilli())
	start, end, ok := paddedWindowNanos(TraceTimeRangeOpts{
		FromMS:  fromMS,
		ToMS:    toMS,
		Padding: 6 * time.Hour,
	})
	require.True(t, ok)
	pad := (6 * time.Hour).Nanoseconds()
	assert.Equal(t, int64(fromMS)*1_000_000-pad, start)
	assert.Equal(t, int64(toMS)*1_000_000+pad, end)

	_, _, ok = paddedWindowNanos(TraceTimeRangeOpts{})
	assert.False(t, ok)
}

func TestIsCloseToWindowEdge(t *testing.T) {
	// Padded window for user [from, to] with 6h padding.
	from := time.Date(2026, 8, 2, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 8, 3, 0, 0, 0, 0, time.UTC)
	pad := 6 * time.Hour
	windowStart := from.Add(-pad).UnixNano()
	windowEnd := to.Add(pad).UnixNano()
	margin := pad.Nanoseconds()

	t.Run("midnight-straddle surviving row sits on the user window edge", func(t *testing.T) {
		// Remaining row starts at the original from; dropped row was just before.
		start := from.UnixNano()
		end := from.Add(2 * time.Minute).UnixNano()
		assert.True(t, isCloseToWindowEdge(start, end, windowStart, windowEnd, margin))
	})

	t.Run("trace fully inside the selected window is not suspicious", func(t *testing.T) {
		start := from.Add(12 * time.Hour).UnixNano()
		end := from.Add(12*time.Hour + 2*time.Minute).UnixNano()
		assert.False(t, isCloseToWindowEdge(start, end, windowStart, windowEnd, margin))
	})
}

func TestGetTraceTimeRangeMulti_BoundedFastPath(t *testing.T) {
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	mock := store.Mock()

	from := time.Date(2026, 8, 2, 12, 0, 0, 0, time.UTC)
	to := time.Date(2026, 8, 2, 13, 0, 0, 0, time.UTC)
	startNano := from.Add(10 * time.Minute).UnixNano()
	endNano := from.Add(20 * time.Minute).UnixNano()

	mock.ExpectQueryRow(`(?s)uniqExact\(trace_id\).*fromUnixTimestamp64Nano`).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{
			{Name: "uniq", Type: "UInt64"},
			{Name: "start", Type: "Int64"},
			{Name: "end", Type: "Int64"},
		}, []any{uint64(1), startNano, endNano}))

	finder := NewTraceTimeRangeFinder(store)
	gotStart, gotEnd, exists, err := finder.GetTraceTimeRangeMulti(context.Background(), []string{"t1"}, TraceTimeRangeOpts{
		FromMS:  uint64(from.UnixMilli()),
		ToMS:    uint64(to.UnixMilli()),
		Padding: 6 * time.Hour,
	})
	require.NoError(t, err)
	assert.True(t, exists)
	assert.Equal(t, startNano-1_000_000_000, gotStart)
	assert.Equal(t, endNano+1_000_000_000, gotEnd)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetTraceTimeRangeMulti_FallsBackWhenBoundedMisses(t *testing.T) {
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	mock := store.Mock()

	from := time.Date(2026, 8, 2, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 8, 3, 0, 0, 0, 0, time.UTC)
	trueStart := time.Date(2026, 7, 1, 10, 0, 0, 0, time.UTC).UnixNano()
	trueEnd := time.Date(2026, 7, 1, 10, 2, 0, 0, time.UTC).UnixNano()

	mock.ExpectQueryRow(`(?s)uniqExact\(trace_id\).*fromUnixTimestamp64Nano`).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{
			{Name: "uniq", Type: "UInt64"},
			{Name: "start", Type: "Int64"},
			{Name: "end", Type: "Int64"},
		}, []any{uint64(0), int64(0), int64(0)}))
	mock.ExpectQueryRow(`uniqExact\(trace_id\)`).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{
			{Name: "uniq", Type: "UInt64"},
			{Name: "start", Type: "Int64"},
			{Name: "end", Type: "Int64"},
		}, []any{uint64(1), trueStart, trueEnd}))

	finder := NewTraceTimeRangeFinder(store)
	gotStart, _, exists, err := finder.GetTraceTimeRangeMulti(context.Background(), []string{"t-outside"}, TraceTimeRangeOpts{
		FromMS:  uint64(from.UnixMilli()),
		ToMS:    uint64(to.UnixMilli()),
		Padding: 6 * time.Hour,
	})
	require.NoError(t, err)
	assert.True(t, exists)
	assert.Equal(t, trueStart-1_000_000_000, gotStart)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetTraceTimeRangeMulti_UnboundedPartialMatchStillExists(t *testing.T) {
	// Three IDs requested, only one retained: exists must stay true (legacy
	// count()!=0 semantics), not uniqueCount != len(ids).
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	mock := store.Mock()

	startNano := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC).UnixNano()
	endNano := startNano + int64(time.Minute)

	mock.ExpectQueryRow(`uniqExact\(trace_id\)`).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{
			{Name: "uniq", Type: "UInt64"},
			{Name: "start", Type: "Int64"},
			{Name: "end", Type: "Int64"},
		}, []any{uint64(1), startNano, endNano}))

	finder := NewTraceTimeRangeFinder(store)
	_, _, exists, err := finder.GetTraceTimeRangeMulti(context.Background(), []string{"a", "b", "c"}, TraceTimeRangeOpts{})
	require.NoError(t, err)
	assert.True(t, exists)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetTraceTimeRangeMulti_EdgeTriggersFallback(t *testing.T) {
	store := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
	mock := store.Mock()

	from := time.Date(2026, 8, 2, 0, 0, 0, 0, time.UTC)
	to := time.Date(2026, 8, 3, 0, 0, 0, 0, time.UTC)
	truncatedStart := from.UnixNano()
	truncatedEnd := from.Add(2 * time.Minute).UnixNano()
	trueStart := from.Add(-30 * time.Minute).UnixNano()

	mock.ExpectQueryRow(`(?s)fromUnixTimestamp64Nano`).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{
			{Name: "uniq", Type: "UInt64"},
			{Name: "start", Type: "Int64"},
			{Name: "end", Type: "Int64"},
		}, []any{uint64(1), truncatedStart, truncatedEnd}))
	mock.ExpectQueryRow(`uniqExact\(trace_id\)`).
		WillReturnRow(cmock.NewRow([]cmock.ColumnType{
			{Name: "uniq", Type: "UInt64"},
			{Name: "start", Type: "Int64"},
			{Name: "end", Type: "Int64"},
		}, []any{uint64(1), trueStart, truncatedEnd}))

	finder := NewTraceTimeRangeFinder(store)
	gotStart, _, exists, err := finder.GetTraceTimeRangeMulti(context.Background(), []string{"straddle"}, TraceTimeRangeOpts{
		FromMS:  uint64(from.UnixMilli()),
		ToMS:    uint64(to.UnixMilli()),
		Padding: 6 * time.Hour,
	})
	require.NoError(t, err)
	assert.True(t, exists)
	assert.Equal(t, trueStart-1_000_000_000, gotStart)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestBuildTraceTimeRangeQuery_DoesNotUseCount(t *testing.T) {
	query, _ := buildTraceTimeRangeQuery([]string{"x"}, 1, 2)
	unbounded, _ := buildTraceTimeRangeQuery([]string{"x"}, 0, 0)
	for _, q := range []string{query, unbounded} {
		assert.False(t, strings.Contains(q, "count()"), q)
		assert.Regexp(t, regexp.MustCompile(`uniqExact\(trace_id\)`), q)
	}
}
