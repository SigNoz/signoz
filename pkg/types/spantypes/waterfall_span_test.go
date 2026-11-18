package spantypes

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/stretchr/testify/assert"
)

func TestStorableSpanAttributes(t *testing.T) {
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
			name: "JSONColumn_ScalarAndObjectKey_StaysTwoPaths",
			span: StorableSpan{
				AttributesJSON: jsonAttrs(map[string]any{"db.function": "node_refresh", "db.function.arg_count": int64(2)}),
			},
			wantAttrs: map[string]any{"db.function": "node_refresh", "db.function.arg_count": float64(2)},
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
			assert.Equal(t, testCase.wantAttrs, testCase.span.Attributes())
		})
	}
}
