package spantypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewThreadQuery_Cursor(t *testing.T) {
	testCases := []struct {
		name    string
		cursor  string
		want    *ThreadCursor
		wantErr bool
	}{
		{name: "EncodedCursor_RoundTrips", cursor: ThreadCursor{TimeUnixNano: 1757500000123456789, SpanID: "f1fa1bc863e94dd0"}.Encode(), want: &ThreadCursor{TimeUnixNano: 1757500000123456789, SpanID: "f1fa1bc863e94dd0"}},
		{name: "NotBase64_Rejected", cursor: "not base64!", wantErr: true},
		{name: "NotJSON_Rejected", cursor: "bm90IGpzb24", wantErr: true},
		{name: "MissingSpanID_Rejected", cursor: "eyJ0aW1lVW5peE5hbm8iOiAxfQ", wantErr: true},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			after, err := NewThreadQuery(&GetTraceThreadParams{After: testCase.cursor})
			before, errBefore := NewThreadQuery(&GetTraceThreadParams{Before: testCase.cursor})
			if testCase.wantErr {
				assert.Error(t, err)
				assert.Error(t, errBefore)
				return
			}
			require.NoError(t, err)
			require.NoError(t, errBefore)
			assert.Equal(t, testCase.want, after.After)
			assert.Nil(t, after.Before)
			assert.Equal(t, testCase.want, before.Before)
			assert.Nil(t, before.After)
		})
	}
}

func TestThreadAttributes(t *testing.T) {
	testCases := []struct {
		name      string
		span      StorableSpan
		wantAttrs map[string]any
	}{
		{
			name: "JSONColumnPresent_LegacyMapsIgnored",
			span: StorableSpan{
				AttributesJSON:   telemetrystoretypes.JSONValue{"gen_ai": map[string]any{"request": map[string]any{"model": "json"}}},
				AttributesString: map[string]string{"gen_ai.request.model": "map", "http.method": "GET"},
			},
			wantAttrs: map[string]any{"gen_ai.request.model": "json"},
		},
		{
			name: "NoJSONColumn_FallsBackToLegacyMaps",
			span: StorableSpan{
				AttributesString: map[string]string{"gen_ai.output.messages": `[{"role":"assistant","content":"hello"}]`},
				AttributesNumber: map[string]float64{"gen_ai.usage.input_tokens": 12},
				AttributesBool:   map[string]bool{"gen_ai.stream": true},
			},
			wantAttrs: map[string]any{
				"gen_ai.output.messages":    `[{"role":"assistant","content":"hello"}]`,
				"gen_ai.usage.input_tokens": float64(12),
				"gen_ai.stream":             true,
			},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.wantAttrs, threadAttributes(&testCase.span))
		})
	}
}

func TestRawAttribute(t *testing.T) {
	arguments := map[string]any{"city": "Paris", "days": []any{1.0, 2.0}}
	testCases := []struct {
		name     string
		storable StorableSpan
		key      string
		want     any
	}{
		{
			name:     "JSONColumn_ObjectWhole",
			storable: StorableSpan{AttributesJSON: telemetrystoretypes.JSONValue{"gen_ai": map[string]any{"tool": map[string]any{"call": map[string]any{"arguments": arguments}}}}},
			key:      "gen_ai.tool.call.arguments",
			want:     arguments,
		},
		{
			name:     "JSONColumn_Missing",
			storable: StorableSpan{AttributesJSON: telemetrystoretypes.JSONValue{"gen_ai": map[string]any{"tool": map[string]any{"name": "get_weather"}}}},
			key:      "gen_ai.tool.call.arguments",
		},
		{
			name:     "LegacyMaps_SplitKeysNotJoined",
			storable: StorableSpan{AttributesString: map[string]string{"gen_ai.tool.call.arguments.city": "Paris"}},
			key:      "gen_ai.tool.call.arguments",
		},
		{
			name:     "LegacyMaps_String",
			storable: StorableSpan{AttributesString: map[string]string{"gen_ai.output.messages": "sunny"}},
			key:      "gen_ai.output.messages",
			want:     "sunny",
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, rawAttribute(&testCase.storable, threadAttributes(&testCase.storable), testCase.key))
		})
	}
}
