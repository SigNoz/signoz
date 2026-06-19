package spantypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func simGroup(name string, attrCond, resCond []string, mappers ...*SpanMapper) *SpanMapperGroupWithMappers {
	return &SpanMapperGroupWithMappers{
		Group: &SpanMapperGroup{
			Name:      name,
			Condition: SpanMapperGroupCondition{Attributes: attrCond, Resource: resCond},
			Enabled:   true,
		},
		Mappers: mappers,
	}
}

func simMapper(target string, ctx FieldContext, sources ...SpanMapperSource) *SpanMapper {
	return &SpanMapper{
		Name:         target,
		FieldContext: ctx,
		Config:       SpanMapperConfig{Sources: sources},
		Enabled:      true,
	}
}

func simAttrSrc(key string, op SpanMapperOperation, priority int) SpanMapperSource {
	return SpanMapperSource{Key: key, Context: FieldContextSpanAttribute, Operation: op, Priority: priority}
}

func simResSrc(key string, op SpanMapperOperation, priority int) SpanMapperSource {
	return SpanMapperSource{Key: key, Context: FieldContextResource, Operation: op, Priority: priority}
}

func TestSimulate_MatchInSpanAttrs(t *testing.T) {
	groups := []*SpanMapperGroupWithMappers{
		simGroup("llm", []string{"model"}, nil,
			simMapper("gen_ai.request.model", FieldContextSpanAttribute,
				simAttrSrc("llm.model", SpanMapperOperationCopy, 1)),
		),
	}
	_, outSpan := SimulateMappingForAttributes(groups, nil, map[string]any{"llm.model": "gpt-4", "gen_ai.llm.model": "gpt-40"})

	assert.Equal(t, "gpt-4", outSpan["gen_ai.request.model"])
}

func TestSimulate_MatchInResourceAttrs(t *testing.T) {
	groups := []*SpanMapperGroupWithMappers{
		simGroup("llm", nil, []string{"service.name"},
			simMapper("gen_ai.request.model", FieldContextSpanAttribute,
				simResSrc("service.name", SpanMapperOperationCopy, 1)),
		),
	}
	_, outSpan := SimulateMappingForAttributes(groups, map[string]any{"service.name": "my-llm-service"}, nil)

	assert.Equal(t, "my-llm-service", outSpan["gen_ai.request.model"])
}

func TestSimulate_NoMatchSkipsGroup(t *testing.T) {
	groups := []*SpanMapperGroupWithMappers{
		simGroup("llm", []string{"model"}, nil,
			simMapper("gen_ai.request.model", FieldContextSpanAttribute,
				simAttrSrc("llm.model", SpanMapperOperationCopy, 1)),
		),
	}
	_, outSpan := SimulateMappingForAttributes(groups, nil, map[string]any{"some.other.key": "value"})

	_, ok := outSpan["gen_ai.request.model"]
	assert.False(t, ok, "target must not be set when condition is not met")
}

func TestSimulate_SourceFirstMatchWins(t *testing.T) {
	groups := []*SpanMapperGroupWithMappers{
		simGroup("tokens", []string{"llm"}, nil,
			simMapper("gen_ai.request.tokens", FieldContextSpanAttribute,
				simAttrSrc("gen_ai.request_tokens", SpanMapperOperationCopy, 2),
				simAttrSrc("llm.tokens", SpanMapperOperationCopy, 1)),
		),
	}
	_, outSpan := SimulateMappingForAttributes(groups, nil, map[string]any{"gen_ai.request_tokens": "100", "llm.tokens": "200"})

	assert.Equal(t, "100", outSpan["gen_ai.request.tokens"])
}

func TestSimulate_SourceFallsBackToSecond(t *testing.T) {
	groups := []*SpanMapperGroupWithMappers{
		simGroup("tokens", []string{"llm"}, nil,
			simMapper("gen_ai.request.tokens", FieldContextSpanAttribute,
				simAttrSrc("gen_ai.request_tokens", SpanMapperOperationCopy, 2),
				simAttrSrc("llm.tokens", SpanMapperOperationCopy, 1)),
		),
	}
	_, outSpan := SimulateMappingForAttributes(groups, nil, map[string]any{"llm.tokens": "200"})

	assert.Equal(t, "200", outSpan["gen_ai.request.tokens"])
}

func TestSimulate_ActionMove(t *testing.T) {
	groups := []*SpanMapperGroupWithMappers{
		simGroup("input", []string{"gen_ai"}, nil,
			simMapper("gen_ai.request.input", FieldContextSpanAttribute,
				simAttrSrc("gen_ai.input", SpanMapperOperationMove, 1)),
		),
	}
	_, outSpan := SimulateMappingForAttributes(groups, nil, map[string]any{"gen_ai.input": "hello"})

	assert.Equal(t, "hello", outSpan["gen_ai.request.input"])
	_, srcPresent := outSpan["gen_ai.input"]
	assert.False(t, srcPresent, "source key must be deleted when action=move")
}

func TestSimulate_WriteToResourceContext(t *testing.T) {
	groups := []*SpanMapperGroupWithMappers{
		simGroup("llm", []string{"llm"}, nil,
			simMapper("gen_ai.request.model", FieldContextResource,
				simAttrSrc("llm.model", SpanMapperOperationCopy, 1)),
		),
	}
	outResource, outSpan := SimulateMappingForAttributes(groups, nil, map[string]any{"llm.model": "gpt-4"})

	assert.Equal(t, "gpt-4", outResource["gen_ai.request.model"], "target must be written to resource attributes")
	_, inSpan := outSpan["gen_ai.request.model"]
	assert.False(t, inSpan)
}

func TestSimulate_DisabledGroupsAndMappersSkipped(t *testing.T) {
	disabledGroup := simGroup("g1", []string{"llm"}, nil,
		simMapper("gen_ai.request.model", FieldContextSpanAttribute,
			simAttrSrc("llm.model", SpanMapperOperationCopy, 1)))
	disabledGroup.Group.Enabled = false

	_, outSpan := SimulateMappingForAttributes([]*SpanMapperGroupWithMappers{disabledGroup}, nil, map[string]any{"llm.model": "gpt-4"})

	_, ok := outSpan["gen_ai.request.model"]
	assert.False(t, ok, "disabled groups must not be evaluated")
}

func TestSimulate_NoMappingsReturnsInputUnchanged(t *testing.T) {
	outResource, outSpan := SimulateMappingForAttributes(nil, map[string]any{"host.name": "h1"}, map[string]any{"model": "gpt-5"})

	assert.Equal(t, map[string]any{"host.name": "h1"}, outResource, "resource attributes returned unchanged")
	assert.Equal(t, map[string]any{"model": "gpt-5"}, outSpan, "span attributes returned unchanged")
}

func TestSimulate_DoesNotMutateInput(t *testing.T) {
	input := map[string]any{"gen_ai.input": "hi"}
	groups := []*SpanMapperGroupWithMappers{
		simGroup("input", []string{"gen_ai"}, nil,
			simMapper("gen_ai.request.input", FieldContextSpanAttribute,
				simAttrSrc("gen_ai.input", SpanMapperOperationMove, 1))),
	}
	_, _ = SimulateMappingForAttributes(groups, nil, input)

	// Original input map must be untouched (move would have deleted the key).
	_, ok := input["gen_ai.input"]
	assert.True(t, ok, "input map must not be mutated by the preview")
}
