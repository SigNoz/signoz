package spantypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
	// Span "a" starts at second 1, "b" at 2, and so on.
	startOf := func(id string) time.Time { return time.Unix(int64(id[0]-'a'+1), 0) }
	spans := func(ids ...string) []StorableSpan {
		out := make([]StorableSpan, len(ids))
		for i, id := range ids {
			out[i] = StorableSpan{SpanID: id, StartTime: startOf(id)}
		}
		return out
	}
	cursorAt := func(id string) *ThreadCursor {
		return &ThreadCursor{TimeUnixNano: uint64(startOf(id).UnixNano()), SpanID: id}
	}
	cursorOf := func(id string) string { return cursorAt(id).Encode() }

	testCases := []struct {
		name  string
		query ThreadQuery
		// Store rows: up to limit+1 per side, beforeRows in descending order.
		beforeRows          []StorableSpan
		afterRows           []StorableSpan
		wantResponseSpanIDs []string
		wantPrevCursor      string
		wantNextCursor      string
	}{
		{
			name:                "FirstPage_ExtraRow_SetsNextOnly",
			query:               ThreadQuery{Limit: 2},
			afterRows:           spans("a", "b", "c"),
			wantResponseSpanIDs: []string{"a", "b"},
			wantNextCursor:      cursorOf("b"),
		},
		{
			name:                "FirstPage_NoExtraRow_NoCursors",
			query:               ThreadQuery{Limit: 3},
			afterRows:           spans("a", "b"),
			wantResponseSpanIDs: []string{"a", "b"},
		},
		{
			name:                "FirstPage_Empty_NoCursors",
			query:               ThreadQuery{Limit: 3},
			wantResponseSpanIDs: []string{},
		},
		{
			name:                "After_NoExtraRow_SetsPrevOnly",
			query:               ThreadQuery{Limit: 2, After: cursorAt("b")},
			afterRows:           spans("c"),
			wantResponseSpanIDs: []string{"c"},
			wantPrevCursor:      cursorOf("c"),
		},
		{
			name:                "After_ExtraRow_SetsBoth",
			query:               ThreadQuery{Limit: 1, After: cursorAt("b")},
			afterRows:           spans("c", "d"),
			wantResponseSpanIDs: []string{"c"},
			wantPrevCursor:      cursorOf("c"),
			wantNextCursor:      cursorOf("c"),
		},
		{
			name:                "Before_NoExtraRow_ReversesAndSetsNextOnly",
			query:               ThreadQuery{Limit: 2, Before: cursorAt("c")},
			beforeRows:          spans("b", "a"),
			wantResponseSpanIDs: []string{"a", "b"},
			wantNextCursor:      cursorOf("b"),
		},
		{
			name:                "Before_ExtraRow_KeepsNearestAndSetsBoth",
			query:               ThreadQuery{Limit: 2, Before: cursorAt("d")},
			beforeRows:          spans("c", "b", "a"),
			wantResponseSpanIDs: []string{"b", "c"},
			wantPrevCursor:      cursorOf("b"),
			wantNextCursor:      cursorOf("c"),
		},
		{
			name:                "SpanID_BothSidesFull_SplitsLimitInHalf",
			query:               ThreadQuery{Limit: 4, SpanID: "d"},
			beforeRows:          spans("c", "b", "a"),
			afterRows:           spans("d", "e", "f"),
			wantResponseSpanIDs: []string{"b", "c", "d", "e"},
			wantPrevCursor:      cursorOf("b"),
			wantNextCursor:      cursorOf("e"),
		},
		{
			name:                "SpanID_NothingBefore_AfterFillsPage",
			query:               ThreadQuery{Limit: 4, SpanID: "a"},
			afterRows:           spans("a", "b", "c", "d"),
			wantResponseSpanIDs: []string{"a", "b", "c", "d"},
		},
		{
			name:                "SpanID_OnlyAnchorAfter_BeforeFillsPage",
			query:               ThreadQuery{Limit: 4, SpanID: "d"},
			beforeRows:          spans("c", "b", "a"),
			afterRows:           spans("d"),
			wantResponseSpanIDs: []string{"a", "b", "c", "d"},
		},
		{
			name:                "SpanID_LimitOne_KeepsAnchor",
			query:               ThreadQuery{Limit: 1, SpanID: "b"},
			beforeRows:          spans("a"),
			afterRows:           spans("b", "c"),
			wantResponseSpanIDs: []string{"b"},
			wantPrevCursor:      cursorOf("b"),
			wantNextCursor:      cursorOf("b"),
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			thread := NewGettableTraceThread("trace-1", &testCase.query, testCase.beforeRows, testCase.afterRows)
			require.NotNil(t, thread.Spans)
			spanIDs := make([]string, len(thread.Spans))
			for i, span := range thread.Spans {
				spanIDs[i] = span.SpanID
				assert.Equal(t, "trace-1", span.TraceID)
			}
			assert.Equal(t, testCase.wantResponseSpanIDs, spanIDs)
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
