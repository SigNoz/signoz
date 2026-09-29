package spantypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/stretchr/testify/assert"
)

func TestStorableSpanAttributes(t *testing.T) {
	testCases := []struct {
		name      string
		span      StorableSpan
		wantAttrs map[string]any
	}{
		{
			name: "LegacyMapOnly_Kept",
			span: StorableSpan{AttributesString: map[string]string{
				"gen_ai.input.messages":  `[{"role":"user","parts":[{"type":"text","content":"hi"}]}]`,
				"gen_ai.output.messages": `[{"role":"assistant","parts":[{"type":"text","content":"hello"}],"finish_reason":"stop"}]`,
			}},
			wantAttrs: map[string]any{
				"gen_ai.input.messages":  `[{"role":"user","parts":[{"type":"text","content":"hi"}]}]`,
				"gen_ai.output.messages": `[{"role":"assistant","parts":[{"type":"text","content":"hello"}],"finish_reason":"stop"}]`,
			},
		},
		{
			name: "JSONColumn_FlattenedToDottedKeys",
			span: StorableSpan{AttributesJSON: telemetrystoretypes.JSONValue{
				"gen_ai": map[string]any{
					"input":   map[string]any{"messages": `[{"role":"user","content":"hi"}]`},
					"request": map[string]any{"model": "gpt-4o"},
				},
			}},
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
			name:      "NoMessages_AttributesKept",
			span:      StorableSpan{AttributesString: map[string]string{"http.method": "GET"}},
			wantAttrs: map[string]any{"http.method": "GET"},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.wantAttrs, testCase.span.Attributes())
		})
	}
}
