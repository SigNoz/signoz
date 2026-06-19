package implspanmapper

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeStore is a minimal SpanMapperStore for previewing: only ListGroups and
// ListMappers carry data; the rest are unused by PreviewMapping.
type fakeStore struct {
	groups  []*spantypes.SpanMapperGroup
	mappers map[string][]*spantypes.SpanMapper
}

func (f *fakeStore) ListGroups(_ context.Context, _ valuer.UUID, _ *spantypes.ListSpanMapperGroupsQuery) ([]*spantypes.SpanMapperGroup, error) {
	return f.groups, nil
}

func (f *fakeStore) ListMappers(_ context.Context, _, groupID valuer.UUID) ([]*spantypes.SpanMapper, error) {
	return f.mappers[groupID.StringValue()], nil
}

func (f *fakeStore) GetGroup(context.Context, valuer.UUID, valuer.UUID) (*spantypes.SpanMapperGroup, error) {
	return nil, nil
}
func (f *fakeStore) CreateGroup(context.Context, *spantypes.SpanMapperGroup) error { return nil }
func (f *fakeStore) UpdateGroup(context.Context, *spantypes.SpanMapperGroup) error { return nil }
func (f *fakeStore) DeleteGroup(context.Context, valuer.UUID, valuer.UUID) error   { return nil }
func (f *fakeStore) GetMapper(context.Context, valuer.UUID, valuer.UUID, valuer.UUID) (*spantypes.SpanMapper, error) {
	return nil, nil
}
func (f *fakeStore) CreateMapper(context.Context, *spantypes.SpanMapper) error { return nil }
func (f *fakeStore) UpdateMapper(context.Context, *spantypes.SpanMapper) error { return nil }
func (f *fakeStore) DeleteMapper(context.Context, valuer.UUID, valuer.UUID, valuer.UUID) error {
	return nil
}

func postableGroup(name string, attrCond []string) spantypes.PostableSpanMapperGroup {
	return spantypes.PostableSpanMapperGroup{
		Name:      name,
		Condition: spantypes.SpanMapperGroupCondition{Attributes: attrCond},
		Enabled:   true,
	}
}

func postableMapper(target, sourceKey string) spantypes.PostableSpanMapper {
	return spantypes.PostableSpanMapper{
		Name:         target,
		FieldContext: spantypes.FieldContextSpanAttribute,
		Config: spantypes.SpanMapperConfig{Sources: []spantypes.SpanMapperSource{
			{Key: sourceKey, Context: spantypes.FieldContextSpanAttribute, Operation: spantypes.SpanMapperOperationCopy, Priority: 1},
		}},
		Enabled: true,
	}
}

func savedMapper(target, sourceKey string) *spantypes.SpanMapper {
	m := postableMapper(target, sourceKey)
	return &spantypes.SpanMapper{Name: m.Name, FieldContext: m.FieldContext, Config: m.Config, Enabled: m.Enabled}
}

func TestPreviewMapping_UsesPayloadMappers(t *testing.T) {
	m := NewModule(&fakeStore{})
	mappers := []spantypes.PostableSpanMapper{postableMapper("gen_ai.request.model", "llm.model")}

	resp, err := m.PreviewMapping(context.Background(), valuer.GenerateUUID(), &spantypes.SpanMappingPreviewRequest{
		Span:   spantypes.SpanMappingPreviewSpan{Attributes: map[string]any{"llm.model": "gpt-4"}},
		Groups: []spantypes.SpanMappingPreviewGroup{{Group: postableGroup("llm", []string{"model"}), Mappers: &mappers}},
	})

	require.NoError(t, err)
	assert.Equal(t, "gpt-4", resp.Span.Attributes["gen_ai.request.model"])
}

func TestPreviewMapping_BackfillsOmittedMappersByName(t *testing.T) {
	gid := valuer.GenerateUUID()
	store := &fakeStore{
		groups:  []*spantypes.SpanMapperGroup{{ID: gid, Name: "llm", Enabled: true}},
		mappers: map[string][]*spantypes.SpanMapper{gid.StringValue(): {savedMapper("gen_ai.request.model", "llm.model")}},
	}
	m := NewModule(store)

	// Mappers omitted (nil) => loaded from the saved group named "llm".
	resp, err := m.PreviewMapping(context.Background(), valuer.GenerateUUID(), &spantypes.SpanMappingPreviewRequest{
		Span:   spantypes.SpanMappingPreviewSpan{Attributes: map[string]any{"llm.model": "gpt-4"}},
		Groups: []spantypes.SpanMappingPreviewGroup{{Group: postableGroup("llm", []string{"model"})}},
	})

	require.NoError(t, err)
	assert.Equal(t, "gpt-4", resp.Span.Attributes["gen_ai.request.model"])
}

func TestPreviewMapping_OmittedMappersUnknownNameErrors(t *testing.T) {
	m := NewModule(&fakeStore{})

	_, err := m.PreviewMapping(context.Background(), valuer.GenerateUUID(), &spantypes.SpanMappingPreviewRequest{
		Span:   spantypes.SpanMappingPreviewSpan{Attributes: map[string]any{"llm.model": "gpt-4"}},
		Groups: []spantypes.SpanMappingPreviewGroup{{Group: postableGroup("missing", []string{"model"})}},
	})

	require.Error(t, err)
}

func TestPreviewMapping_AppliesGroupsInPayloadOrder(t *testing.T) {
	m := NewModule(&fakeStore{})
	first := []spantypes.PostableSpanMapper{postableMapper("gen_ai.request.model", "a.model")}
	second := []spantypes.PostableSpanMapper{postableMapper("gen_ai.request.model", "b.model")}

	resp, err := m.PreviewMapping(context.Background(), valuer.GenerateUUID(), &spantypes.SpanMappingPreviewRequest{
		Span: spantypes.SpanMappingPreviewSpan{Attributes: map[string]any{"a.model": "from-a", "b.model": "from-b"}},
		Groups: []spantypes.SpanMappingPreviewGroup{
			{Group: postableGroup("g1", []string{"model"}), Mappers: &first},
			{Group: postableGroup("g2", []string{"model"}), Mappers: &second},
		},
	})

	require.NoError(t, err)
	// Both groups write the same target; the last group in the array wins.
	assert.Equal(t, "from-b", resp.Span.Attributes["gen_ai.request.model"])
}
