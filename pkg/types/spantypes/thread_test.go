package spantypes

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewThreadQuery(t *testing.T) {
	cursor := ThreadCursor{TimeUnixNano: 1757500000123456789, SpanID: "f1fa1bc863e94dd0"}

	testCases := []struct {
		name      string
		queryable QueryableThread
		want      *ThreadQuery
		wantErr   bool
	}{
		{name: "ZeroLimit_UsesDefault", queryable: QueryableThread{}, want: &ThreadQuery{Limit: threadDefaultLimit}},
		{name: "PositiveLimit_Kept", queryable: QueryableThread{Limit: 25}, want: &ThreadQuery{Limit: 25}},
		{name: "MaxLimit_Kept", queryable: QueryableThread{Limit: threadMaxLimit}, want: &ThreadQuery{Limit: threadMaxLimit}},
		{name: "AboveMaxLimit_Rejected", queryable: QueryableThread{Limit: threadMaxLimit + 1}, wantErr: true},
		{name: "NegativeLimit_Rejected", queryable: QueryableThread{Limit: -1}, wantErr: true},
		{name: "Cursor_Decoded", queryable: QueryableThread{Limit: 10, Cursor: cursor.Encode()}, want: &ThreadQuery{Limit: 10, Cursor: &cursor}},
		{name: "InvalidCursor_Rejected", queryable: QueryableThread{Cursor: "not base64!"}, wantErr: true},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got, err := NewThreadQuery(&testCase.queryable)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.want, got)
		})
	}
}

func TestDecodeThreadCursor(t *testing.T) {
	testCases := []struct {
		name    string
		cursor  string
		want    *ThreadCursor
		wantErr bool
	}{
		{name: "EncodedCursor_RoundTrips", cursor: ThreadCursor{TimeUnixNano: 1757500000123456789, SpanID: "f1fa1bc863e94dd0"}.Encode(), want: &ThreadCursor{TimeUnixNano: 1757500000123456789, SpanID: "f1fa1bc863e94dd0"}},
		{name: "NotBase64_Rejected", cursor: "not base64!", wantErr: true},
		{name: "NotJSON_Rejected", cursor: "bm90IGpzb24", wantErr: true},
		{name: "MissingSpanID_Rejected", cursor: "eyJ0IjogMX0", wantErr: true},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got, err := DecodeThreadCursor(testCase.cursor)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, testCase.want, got)
		})
	}
}

func TestNewGettableTraceThread(t *testing.T) {
	spans := []StorableSpan{
		{SpanID: "a", StartTime: time.Unix(1, 500_000_000)},
		{SpanID: "b", StartTime: time.Unix(2, 0)},
		{SpanID: "c", StartTime: time.Unix(3, 0)},
	}

	testCases := []struct {
		name           string
		spans          []StorableSpan
		limit          int
		wantSpanIDs    []string
		wantTimeUnix   []uint64
		wantNextCursor string
	}{
		{name: "MoreThanLimit_TrimsAndSetsCursor", spans: spans, limit: 2, wantSpanIDs: []string{"a", "b"}, wantTimeUnix: []uint64{1500, 2000}, wantNextCursor: ThreadCursor{TimeUnixNano: 2_000_000_000, SpanID: "b"}.Encode()},
		{name: "WithinLimit_NoCursor", spans: spans, limit: 3, wantSpanIDs: []string{"a", "b", "c"}, wantTimeUnix: []uint64{1500, 2000, 3000}},
		{name: "NoSpans_EmptyList", limit: 3, wantSpanIDs: []string{}, wantTimeUnix: []uint64{}},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			thread := NewGettableTraceThread("trace-1", testCase.spans, testCase.limit)
			require.NotNil(t, thread.Spans)
			spanIDs := make([]string, len(thread.Spans))
			timeUnix := make([]uint64, len(thread.Spans))
			for i, span := range thread.Spans {
				spanIDs[i] = span.SpanID
				timeUnix[i] = span.TimeUnix
				assert.Equal(t, "trace-1", span.TraceID)
			}
			assert.Equal(t, testCase.wantSpanIDs, spanIDs)
			assert.Equal(t, testCase.wantTimeUnix, timeUnix)
			assert.Equal(t, testCase.wantNextCursor, thread.NextCursor)
		})
	}

}
