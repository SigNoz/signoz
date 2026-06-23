package spantypes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestSimulateSpanMappersProcessing_EndToEnd is an integration test: it spins
// up an actual in-memory otel-collector pipeline with signozspanmapperprocessor
// and verifies the produced span has the expected target attribute.
func TestSimulateSpanMappersProcessing_EndToEnd(t *testing.T) {
	groups := []*SpanMapperGroupWithMappers{{
		Group: &SpanMapperGroup{
			Name:      "llm",
			Condition: SpanMapperGroupCondition{Attributes: []string{"model"}},
			Enabled:   true,
		},
		Mappers: []*SpanMapper{{
			Name:         "gen_ai.request.model",
			FieldContext: FieldContextSpanAttribute,
			Config: SpanMapperConfig{Sources: []SpanMapperSource{
				{Key: "llm.model", Context: FieldContextSpanAttribute, Operation: SpanMapperOperationCopy, Priority: 1},
			}},
			Enabled: true,
		}},
	}}

	spans := []SpanMapperTestSpan{{Attributes: map[string]any{"llm.model": "gpt-4"}}}

	out, _, err := SimulateSpanMappersProcessing(context.Background(), groups, spans)

	require.NoError(t, err)
	require.Len(t, out, 1)
	assert.Equal(t, "gpt-4", out[0].Attributes["gen_ai.request.model"], "target attribute must be populated by the spanmapper processor")
	// Source attribute is preserved (copy, not move).
	assert.Equal(t, "gpt-4", out[0].Attributes["llm.model"])
	// Order-tracking attribute is stripped from the output.
	_, hasOrderAttr := out[0].Attributes[spanInputOrderAttr]
	assert.False(t, hasOrderAttr, "internal ordering attribute must be removed from the response")
}
