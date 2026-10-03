package spantypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
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
		{name: "After_Decoded", queryable: QueryableThread{Limit: 10, After: cursor.Encode()}, want: &ThreadQuery{Limit: 10, After: &cursor}},
		{name: "Before_Decoded", queryable: QueryableThread{Limit: 10, Before: cursor.Encode()}, want: &ThreadQuery{Limit: 10, Before: &cursor}},
		{name: "SpanID_Kept", queryable: QueryableThread{SpanID: "f1fa1bc863e94dd0"}, want: &ThreadQuery{Limit: threadDefaultLimit, SpanID: "f1fa1bc863e94dd0"}},
		{name: "InvalidAfter_Rejected", queryable: QueryableThread{After: "not base64!"}, wantErr: true},
		{name: "InvalidBefore_Rejected", queryable: QueryableThread{Before: "not base64!"}, wantErr: true},
		{name: "AfterAndBefore_Rejected", queryable: QueryableThread{After: cursor.Encode(), Before: cursor.Encode()}, wantErr: true},
		{name: "AfterAndSpanID_Rejected", queryable: QueryableThread{After: cursor.Encode(), SpanID: "a"}, wantErr: true},
		{name: "BeforeAndSpanID_Rejected", queryable: QueryableThread{Before: cursor.Encode(), SpanID: "a"}, wantErr: true},
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
	span := func(id string, sec int64) StorableSpan { return StorableSpan{SpanID: id, StartTime: time.Unix(sec, 0)} }
	key := func(id string, sec int64) string {
		return ThreadCursor{TimeUnixNano: uint64(sec * int64(time.Second)), SpanID: id}.Encode()
	}
	cursor := &ThreadCursor{TimeUnixNano: 1, SpanID: "x"}

	testCases := []struct {
		name           string
		query          ThreadQuery
		before         []StorableSpan
		after          []StorableSpan
		wantSpanIDs    []string
		wantPrevCursor string
		wantNextCursor string
	}{
		{name: "FirstPage_MoreThanLimit_SetsNext", query: ThreadQuery{Limit: 2}, after: []StorableSpan{span("a", 1), span("b", 2), span("c", 3)}, wantSpanIDs: []string{"a", "b"}, wantNextCursor: key("b", 2)},
		{name: "FirstPage_WithinLimit_NoCursors", query: ThreadQuery{Limit: 3}, after: []StorableSpan{span("a", 1), span("b", 2)}, wantSpanIDs: []string{"a", "b"}},
		{name: "FirstPage_Empty", query: ThreadQuery{Limit: 3}, wantSpanIDs: []string{}},
		{name: "After_SetsPrev", query: ThreadQuery{Limit: 2, After: cursor}, after: []StorableSpan{span("c", 3)}, wantSpanIDs: []string{"c"}, wantPrevCursor: key("c", 3)},
		{name: "After_MoreThanLimit_SetsBoth", query: ThreadQuery{Limit: 1, After: cursor}, after: []StorableSpan{span("c", 3), span("d", 4)}, wantSpanIDs: []string{"c"}, wantPrevCursor: key("c", 3), wantNextCursor: key("c", 3)},
		{name: "Before_ReversedAndSetsNext", query: ThreadQuery{Limit: 2, Before: cursor}, before: []StorableSpan{span("b", 2), span("a", 1)}, wantSpanIDs: []string{"a", "b"}, wantNextCursor: key("b", 2)},
		{name: "Before_MoreThanLimit_SetsBoth", query: ThreadQuery{Limit: 2, Before: cursor}, before: []StorableSpan{span("c", 3), span("b", 2), span("a", 1)}, wantSpanIDs: []string{"b", "c"}, wantPrevCursor: key("b", 2), wantNextCursor: key("c", 3)},
		{name: "SpanID_SplitsPage", query: ThreadQuery{Limit: 4, SpanID: "c"}, before: []StorableSpan{span("b", 2), span("a", 1), span("z", 0)}, after: []StorableSpan{span("c", 3), span("d", 4), span("e", 5)}, wantSpanIDs: []string{"a", "b", "c", "d"}, wantPrevCursor: key("a", 1), wantNextCursor: key("d", 4)},
		{name: "SpanID_ShortBefore_FillsAfter", query: ThreadQuery{Limit: 4, SpanID: "a"}, after: []StorableSpan{span("a", 1), span("b", 2), span("c", 3), span("d", 4)}, wantSpanIDs: []string{"a", "b", "c", "d"}},
		{name: "SpanID_ShortAfter_FillsBefore", query: ThreadQuery{Limit: 4, SpanID: "d"}, before: []StorableSpan{span("c", 3), span("b", 2), span("a", 1)}, after: []StorableSpan{span("d", 4)}, wantSpanIDs: []string{"a", "b", "c", "d"}},
		{name: "SpanID_LimitOne_KeepsAnchor", query: ThreadQuery{Limit: 1, SpanID: "b"}, before: []StorableSpan{span("a", 1)}, after: []StorableSpan{span("b", 2), span("c", 3)}, wantSpanIDs: []string{"b"}, wantPrevCursor: key("b", 2), wantNextCursor: key("b", 2)},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			thread := NewGettableTraceThread("trace-1", &testCase.query, testCase.before, testCase.after)
			require.NotNil(t, thread.Spans)
			spanIDs := make([]string, len(thread.Spans))
			for i, span := range thread.Spans {
				spanIDs[i] = span.SpanID
				assert.Equal(t, "trace-1", span.TraceID)
			}
			assert.Equal(t, testCase.wantSpanIDs, spanIDs)
			assert.Equal(t, testCase.wantPrevCursor, thread.PrevCursor)
			assert.Equal(t, testCase.wantNextCursor, thread.NextCursor)
		})
	}
}

func TestNewThreadSpan_TimeUnixInMillis(t *testing.T) {
	span := newThreadSpan("trace-1", &StorableSpan{SpanID: "a", StartTime: time.Unix(1, 500_000_000)})
	assert.Equal(t, uint64(1500), span.TimeUnix)
	assert.Equal(t, ThreadCursor{TimeUnixNano: 1_500_000_000, SpanID: "a"}, span.cursor())
}

func TestNewThreadSpan(t *testing.T) {
	userHi := []aiobservabilitytypes.Message{{
		Role:    aiobservabilitytypes.MessageRoleUser,
		Content: []aiobservabilitytypes.Part{{Type: aiobservabilitytypes.PartTypeText, Content: "hi"}},
	}}
	assistantHello := []aiobservabilitytypes.Message{{
		Role:         aiobservabilitytypes.MessageRoleAssistant,
		Content:      []aiobservabilitytypes.Part{{Type: aiobservabilitytypes.PartTypeText, Content: "hello"}},
		FinishReason: aiobservabilitytypes.FinishReasonStop,
	}}

	testCases := []struct {
		name       string
		span       StorableSpan
		wantInput  []aiobservabilitytypes.Message
		wantOutput []aiobservabilitytypes.Message
	}{
		{
			name: "InputAndOutput_BothFormatted",
			span: StorableSpan{AttributesJSON: telemetrystoretypes.JSONValue{"gen_ai": map[string]any{
				"input":  map[string]any{"messages": `[{"role":"user","parts":[{"type":"text","content":"hi"}]}]`},
				"output": map[string]any{"messages": `[{"role":"assistant","parts":[{"type":"text","content":"hello"}],"finish_reason":"stop"}]`},
			}}},
			wantInput:  userHi,
			wantOutput: assistantHello,
		},
		{
			name:      "InputOnly_OutputUnset",
			span:      StorableSpan{AttributesJSON: telemetrystoretypes.JSONValue{"gen_ai": map[string]any{"input": map[string]any{"messages": `[{"role":"user","content":"hi"}]`}}}},
			wantInput: userHi,
		},
		{
			name: "NoMessages_BothUnset",
			span: StorableSpan{AttributesJSON: telemetrystoretypes.JSONValue{"http": map[string]any{"method": "GET"}}},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			span := newThreadSpan("trace-1", &testCase.span)
			assert.Equal(t, testCase.wantInput, span.FormattedInput)
			assert.Equal(t, testCase.wantOutput, span.FormattedOutput)
		})
	}
}
