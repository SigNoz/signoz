package spantypes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

func TestGenerateCollectorConfigWithSpanMapperProcessor(t *testing.T) {
	t.Parallel()

	baseline := loadFixture(t, "collector_baseline.yaml")

	tests := []struct {
		name   string
		groups []*SpanMapperGroupWithMappers
		want   string
	}{
		{
			name: "no_groups",
			want: "collector_no_groups.yaml",
		},
		{
			name: "with_groups",
			groups: []*SpanMapperGroupWithMappers{
				{
					Group: newGroup("llm", []string{"model"}, []string{"service.name"}),
					Mappers: []*SpanMapper{
						newMapper("gen_ai.request.model", FieldContextResource,
							attrSrc("gen_ai.llm.model", SpanMapperOperationCopy, 3),
							attrSrc("llm.model", SpanMapperOperationCopy, 2),
							resSrc("service.name", SpanMapperOperationCopy, 1),
						),
						newMapper("gen_ai.request.tokens", FieldContextSpanAttribute,
							attrSrc("gen_ai.request_tokens", SpanMapperOperationCopy, 2),
							attrSrc("llm.tokens", SpanMapperOperationCopy, 1),
						),
						newMapper("gen_ai.request.input", FieldContextSpanAttribute,
							attrSrc("gen_ai.input", SpanMapperOperationMove, 2),
							attrSrc("llm.input", SpanMapperOperationMove, 1),
						),
					},
				},
				{
					Group: newGroup("agent", []string{"agent."}, nil),
					Mappers: []*SpanMapper{
						newMapper("gen_ai.agent.name", FieldContextSpanAttribute,
							attrSrc("agent.name", SpanMapperOperationCopy, 2),
							attrSrc("llm.agent.name", SpanMapperOperationCopy, 1),
						),
						newMapper("gen_ai.agent.id", FieldContextSpanAttribute,
							attrSrc("gen_ai.agent.id", SpanMapperOperationCopy, 2),
							attrSrc("llm.agent.id", SpanMapperOperationCopy, 1),
						),
					},
				},
				{
					Group: newGroup("tool", []string{"agent."}, nil),
					Mappers: []*SpanMapper{
						newMapper("gen_ai.tool.name", FieldContextSpanAttribute,
							attrSrc("ai.tool.name", SpanMapperOperationCopy, 2),
							attrSrc("llm.tool.name", SpanMapperOperationCopy, 1),
						),
					},
				},
			},
			want: "collector_with_groups.yaml",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := GenerateCollectorConfigWithSpanMapperProcessor(baseline, tc.groups)
			require.NoError(t, err)
			assertYAMLEqual(t, loadFixture(t, tc.want), got)
		})
	}
}

func TestGenerateCollectorConfigWithSpanMapperProcessor_Errors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		in   []byte
	}{
		{"processors_not_a_map", []byte("processors: not-a-map\n")},
		{"malformed_yaml", []byte(": :")},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			_, err := GenerateCollectorConfigWithSpanMapperProcessor(tc.in, nil)
			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput), "want TypeInvalidInput, got %v", err)
			assert.True(t, errors.Asc(err, ErrCodeInvalidCollectorConfig), "want ErrCodeInvalidCollectorConfig, got %v", err)
		})
	}
}

func TestBuildAttributeRule(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		mapper *SpanMapper
		want   spanMapperProcessorAttribute
	}{
		{
			name: "priority_sort_and_resource_prefix",
			mapper: newMapper("gen_ai.request.model", FieldContextResource,
				attrSrc("llm.model", SpanMapperOperationCopy, 20),
				resSrc("service.name", SpanMapperOperationCopy, 10),
				attrSrc("gen_ai.llm.model", SpanMapperOperationCopy, 30),
			),
			want: spanMapperProcessorAttribute{
				Target:  "gen_ai.request.model",
				Context: FieldContextResource.StringValue(),
				Sources: []spanMapperProcessorSource{
					{Key: "gen_ai.llm.model"},
					{Key: "llm.model"},
					{Key: "resource.service.name"},
				},
			},
		},
		{
			name: "per_source_actions",
			mapper: newMapper("gen_ai.request.input", FieldContextSpanAttribute,
				attrSrc("gen_ai.input", SpanMapperOperationMove, 20),
				attrSrc("llm.input", SpanMapperOperationCopy, 10),
			),
			want: spanMapperProcessorAttribute{
				Target:  "gen_ai.request.input",
				Context: FieldContextSpanAttribute.StringValue(),
				Sources: []spanMapperProcessorSource{
					{Key: "gen_ai.input", Action: SpanMapperOperationMove.StringValue()},
					{Key: "llm.input"},
				},
			},
		},
		{
			name: "disabled_sources_skipped",
			mapper: newMapper("gen_ai.input.messages", FieldContextSpanAttribute,
				systemSrc("gen_ai.prompt", SpanMapperOperationCopy, 30, false),
				systemSrc("input.value", SpanMapperOperationCopy, 20, true),
				attrSrc("gen_ai.prompt", SpanMapperOperationMove, 40),
			),
			want: spanMapperProcessorAttribute{
				Target:  "gen_ai.input.messages",
				Context: FieldContextSpanAttribute.StringValue(),
				Sources: []spanMapperProcessorSource{
					{Key: "gen_ai.prompt", Action: SpanMapperOperationMove.StringValue()},
					{Key: "input.value"},
				},
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.want, buildAttributeRule(tc.mapper))
		})
	}
}

func TestBuildProcessorConfigDropsAllOffItems(t *testing.T) {
	t.Parallel()

	offGroup := newGroup("all-off", nil, nil)
	offGroup.Condition.Attributes = []SpanMapperGroupConditionKey{{Value: "model", Enabled: false, Origin: SpanMapperOriginSystem}}

	mixed := newGroup("llm", nil, nil)
	mixed.Condition.Attributes = []SpanMapperGroupConditionKey{
		{Value: "model", Enabled: false, Origin: SpanMapperOriginSystem},
		{Value: "gen_ai.request.model", Enabled: true, Origin: SpanMapperOriginUser},
	}

	got := buildProcessorConfig([]*SpanMapperGroupWithMappers{
		{Group: offGroup, Mappers: []*SpanMapper{newMapper("gen_ai.request.model", FieldContextSpanAttribute, attrSrc("llm.model", SpanMapperOperationCopy, 1))}},
		{Group: mixed, Mappers: []*SpanMapper{
			newMapper("gen_ai.request.model", FieldContextSpanAttribute, systemSrc("llm.model", SpanMapperOperationCopy, 10, false)),
			newMapper("gen_ai.provider.name", FieldContextSpanAttribute, systemSrc("llm.vendor", SpanMapperOperationCopy, 10, true)),
		}},
	})

	require.Len(t, got.Groups, 1)
	assert.Equal(t, "llm", got.Groups[0].ID)
	assert.Equal(t, []string{"gen_ai.request.model"}, got.Groups[0].ExistsAny.Attributes)
	require.Len(t, got.Groups[0].Attributes, 1)
	assert.Equal(t, "gen_ai.provider.name", got.Groups[0].Attributes[0].Target)
}

func loadFixture(t *testing.T, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", name))
	require.NoError(t, err)
	return b
}

// assertYAMLEqual compares two YAML documents structurally so key order and
// slice formatting do not matter.
func assertYAMLEqual(t *testing.T, want, got []byte) {
	t.Helper()
	var w, g any
	require.NoError(t, yaml.Unmarshal(want, &w))
	require.NoError(t, yaml.Unmarshal(got, &g))
	assert.Equal(t, w, g)
}

func newGroup(name string, attrs, res []string) *SpanMapperGroup {
	return &SpanMapperGroup{
		Name: name,
		Condition: SpanMapperGroupCondition{
			Attributes: NewSpanMapperGroupConditionKeys(attrs, SpanMapperOriginUser),
			Resource:   NewSpanMapperGroupConditionKeys(res, SpanMapperOriginUser),
		},
		Enabled: true,
	}
}

func newMapper(name string, target FieldContext, sources ...SpanMapperSource) *SpanMapper {
	return &SpanMapper{
		Name:         name,
		FieldContext: target,
		Config:       SpanMapperConfig{Sources: sources},
		Enabled:      true,
	}
}

func attrSrc(key string, op SpanMapperOperation, priority int) SpanMapperSource {
	return SpanMapperSource{Key: key, Context: FieldContextSpanAttribute, Operation: op, Priority: priority, Enabled: true, Origin: SpanMapperOriginUser}
}

func resSrc(key string, op SpanMapperOperation, priority int) SpanMapperSource {
	return SpanMapperSource{Key: key, Context: FieldContextResource, Operation: op, Priority: priority, Enabled: true, Origin: SpanMapperOriginUser}
}

func systemSrc(key string, op SpanMapperOperation, priority int, enabled bool) SpanMapperSource {
	return SpanMapperSource{Key: key, Context: FieldContextSpanAttribute, Operation: op, Priority: priority, Enabled: enabled, Origin: SpanMapperOriginSystem}
}
