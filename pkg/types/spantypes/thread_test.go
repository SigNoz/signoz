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
		name     string
		postable PostableThreadQuery
		want     *ThreadQuery
		wantErr  bool
	}{
		{name: "ZeroLimit_UsesDefault", postable: PostableThreadQuery{}, want: &ThreadQuery{Limit: threadDefaultLimit}},
		{name: "PositiveLimit_Kept", postable: PostableThreadQuery{Limit: 25}, want: &ThreadQuery{Limit: 25}},
		{name: "MaxLimit_Kept", postable: PostableThreadQuery{Limit: threadMaxLimit}, want: &ThreadQuery{Limit: threadMaxLimit}},
		{name: "AboveMaxLimit_Rejected", postable: PostableThreadQuery{Limit: threadMaxLimit + 1}, wantErr: true},
		{name: "NegativeLimit_Rejected", postable: PostableThreadQuery{Limit: -1}, wantErr: true},
		{name: "Cursor_Decoded", postable: PostableThreadQuery{Limit: 10, Cursor: cursor.Encode()}, want: &ThreadQuery{Limit: 10, Cursor: &cursor}},
		{name: "InvalidCursor_Rejected", postable: PostableThreadQuery{Cursor: "not base64!"}, wantErr: true},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got, err := NewThreadQuery(&testCase.postable)
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
		wantAttrs  map[string]any
	}{
		{
			name: "MessagesInLegacyMap",
			span: StorableSpan{AttributesString: map[string]string{
				"gen_ai.input.messages":  `[{"role":"user","parts":[{"type":"text","content":"hi"}]}]`,
				"gen_ai.output.messages": `[{"role":"assistant","parts":[{"type":"text","content":"hello"}],"finish_reason":"stop"}]`,
			}},
			wantInput:  userHi,
			wantOutput: assistantHello,
			wantAttrs: map[string]any{
				"gen_ai.input.messages":  `[{"role":"user","parts":[{"type":"text","content":"hi"}]}]`,
				"gen_ai.output.messages": `[{"role":"assistant","parts":[{"type":"text","content":"hello"}],"finish_reason":"stop"}]`,
			},
		},
		{
			name: "MessagesInJSONColumn_FlattenedToDottedKeys",
			span: StorableSpan{AttributesJSON: telemetrystoretypes.JSONValue{
				"gen_ai": map[string]any{
					"input":   map[string]any{"messages": `[{"role":"user","content":"hi"}]`},
					"request": map[string]any{"model": "gpt-4o"},
				},
			}},
			wantInput: userHi,
			wantAttrs: map[string]any{
				"gen_ai.input.messages": `[{"role":"user","content":"hi"}]`,
				"gen_ai.request.model":  "gpt-4o",
			},
		},
		{
			name: "LegacyMapWinsOverJSONColumn",
			span: StorableSpan{
				AttributesJSON:   telemetrystoretypes.JSONValue{"gen_ai": map[string]any{"request": map[string]any{"model": "json"}}},
				AttributesString: map[string]string{"gen_ai.request.model": "map"},
			},
			wantAttrs: map[string]any{"gen_ai.request.model": "map"},
		},
		{
			name:      "NoMessages_FieldsUnset",
			span:      StorableSpan{AttributesString: map[string]string{"http.method": "GET"}},
			wantAttrs: map[string]any{"http.method": "GET"},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			span := newThreadSpan("trace-1", &testCase.span)
			assert.Equal(t, testCase.wantInput, span.FormattedInput)
			assert.Equal(t, testCase.wantOutput, span.FormattedOutput)
			assert.Equal(t, testCase.wantAttrs, span.Attributes)
		})
	}
}
