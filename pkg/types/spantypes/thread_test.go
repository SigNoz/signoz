package spantypes

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

// jsonAttrs builds a JSONValue from dotted leaf paths, as ClickHouse stores them.
func jsonAttrs(paths map[string]any) telemetrystoretypes.JSONValue {
	j := chcol.NewJSON()
	for path, value := range paths {
		j.SetValueAtPath(path, value)
	}
	return telemetrystoretypes.NewJSONValue(*j)
}

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
				AttributesJSON:   jsonAttrs(map[string]any{"gen_ai.request.model": "json"}),
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
		{
			// ClickHouse materializes a row's absent paths as null from the part's path schema.
			name: "JSONColumn_DropsNullPaths",
			span: StorableSpan{
				AttributesJSON: jsonAttrs(map[string]any{"gen_ai.request.model": "gpt-4o", "gen_ai.output.messages": chcol.Variant{}}),
			},
			wantAttrs: map[string]any{"gen_ai.request.model": "gpt-4o"},
		},
		{
			name: "JSONColumn_OnlyNullPaths_FallsBackToLegacyMaps",
			span: StorableSpan{
				AttributesJSON:   jsonAttrs(map[string]any{"gen_ai.output.messages": chcol.Variant{}}),
				AttributesString: map[string]string{"gen_ai.input.messages": "legacy"},
			},
			wantAttrs: map[string]any{"gen_ai.input.messages": "legacy"},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.wantAttrs, threadAttributes(&testCase.span))
		})
	}
}

func TestNewThreadSpan_FormatsJSONMessages(t *testing.T) {
	storable := StorableSpan{
		SpanID:         "f1fa1bc863e94dd0",
		AttributesJSON: jsonAttrs(map[string]any{"gen_ai.input.messages": `[{"role":"user","content":"hi"}]`}),
	}

	span := newThreadSpan("trace", &storable)

	require.Len(t, span.FormattedInput, 1)
	assert.Equal(t, aiobservabilitytypes.RoleUser, span.FormattedInput[0].Role)
}
