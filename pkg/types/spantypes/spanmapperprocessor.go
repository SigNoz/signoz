package spantypes

import (
	"sort"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"gopkg.in/yaml.v3"
)

const (
	SpanAttrMappingFeatureType agentConf.AgentFeatureType = "span_attr_mapping"

	ProcessorName = "signozspanmapper"
)

var (
	ErrCodeInvalidCollectorConfig      = errors.MustNewCode("invalid_collector_config")
	ErrCodeBuildMappingProcessorConfig = errors.MustNewCode("build_mapping_processor_config")
)

type SpanMapperGroupWithMappers struct {
	Group   *SpanMapperGroup `json:"group"`
	Mappers []*SpanMapper    `json:"mappers"`
}

// spanMapperProcessorConfig is the collector config for signozspanmapper.
type spanMapperProcessorConfig struct {
	Groups []spanMapperProcessorGroup `yaml:"groups" json:"groups"`
}

type spanMapperProcessorGroup struct {
	ID         string                         `yaml:"id" json:"id"`
	ExistsAny  spanMapperProcessorExistsAny   `yaml:"exists_any" json:"exists_any"`
	Attributes []spanMapperProcessorAttribute `yaml:"attributes" json:"attributes"`
}

type spanMapperProcessorExistsAny struct {
	Attributes []string `yaml:"attributes,omitempty" json:"attributes,omitempty"`
	Resource   []string `yaml:"resource,omitempty" json:"resource,omitempty"`
}

type spanMapperProcessorAttribute struct {
	Target  string                      `yaml:"target" json:"target"`
	Context string                      `yaml:"context,omitempty" json:"context,omitempty"`
	Sources []spanMapperProcessorSource `yaml:"sources" json:"sources"`
}

type spanMapperProcessorSource struct {
	Key    string `yaml:"key" json:"key"`
	Action string `yaml:"action,omitempty" json:"action,omitempty"`
}

func GenerateCollectorConfigWithSpanMapperProcessor(currentConfYaml []byte, groups []*SpanMapperGroupWithMappers) ([]byte, error) {
	var collectorConf map[string]any
	if err := yaml.Unmarshal(currentConfYaml, &collectorConf); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeInvalidCollectorConfig, "failed to unmarshal collector config")
	}
	// rare but don't do anything in this case, also means it's just comments.
	if collectorConf == nil {
		collectorConf = map[string]any{}
	}

	processors := map[string]any{}
	if existing, ok := collectorConf["processors"]; ok && existing != nil {
		p, ok := existing.(map[string]any)
		if !ok {
			return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidCollectorConfig, "collector config 'processors' must be a mapping, got %T", existing)
		}
		processors = p
	}

	procConfig := buildProcessorConfig(groups)

	processors[ProcessorName] = procConfig
	collectorConf["processors"] = processors

	out, err := yaml.Marshal(collectorConf)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, ErrCodeBuildMappingProcessorConfig, "failed to marshal collector config")
	}
	return out, nil
}

func buildProcessorConfig(groups []*SpanMapperGroupWithMappers) *spanMapperProcessorConfig {
	out := make([]spanMapperProcessorGroup, 0, len(groups))

	for _, gm := range groups {
		existsAny := spanMapperProcessorExistsAny{
			Attributes: enabledConditionValues(gm.Group.Condition.Attributes),
			Resource:   enabledConditionValues(gm.Group.Condition.Resource),
		}
		// The collector rejects an empty exists_any and empty sources; with
		// per-item toggles, all-off is valid stored state and means "never runs".
		if len(existsAny.Attributes)+len(existsAny.Resource) == 0 {
			continue
		}

		rules := make([]spanMapperProcessorAttribute, 0, len(gm.Mappers))
		for _, m := range gm.Mappers {
			rule := buildAttributeRule(m)
			if len(rule.Sources) == 0 {
				continue
			}
			rules = append(rules, rule)
		}
		if len(rules) == 0 {
			continue
		}

		out = append(out, spanMapperProcessorGroup{
			ID:         gm.Group.Name,
			ExistsAny:  existsAny,
			Attributes: rules,
		})
	}

	return &spanMapperProcessorConfig{Groups: out}
}

func enabledConditionValues(keys []SpanMapperGroupConditionKey) []string {
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		if k.Enabled {
			out = append(out, k.Value)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// buildAttributeRule maps a single SpanMapper to a collector attribute rule.
// Disabled sources are skipped and the rest are sorted by Priority DESC
// (highest-priority first); read-from-resource sources are encoded via the
// "resource." prefix on the key. Each source carries its own action — "copy"
// is omitted to keep the emitted YAML compact, and only "move" is set explicitly.
func buildAttributeRule(m *SpanMapper) spanMapperProcessorAttribute {
	sources := make([]SpanMapperSource, 0, len(m.Config.Sources))
	for _, s := range m.Config.Sources {
		if s.Enabled {
			sources = append(sources, s)
		}
	}
	sort.SliceStable(sources, func(i, j int) bool { return sources[i].Priority > sources[j].Priority })

	out := make([]spanMapperProcessorSource, 0, len(sources))
	for _, s := range sources {
		key := s.Key
		if s.Context == FieldContextResource {
			key = FieldContextResource.StringValue() + "." + s.Key
		}
		var action string
		if s.Operation == SpanMapperOperationMove {
			action = SpanMapperOperationMove.StringValue()
		}
		out = append(out, spanMapperProcessorSource{Key: key, Action: action})
	}

	ctx := FieldContextSpanAttribute
	if m.FieldContext == FieldContextResource {
		ctx = FieldContextResource
	}

	return spanMapperProcessorAttribute{
		Target:  m.Name,
		Context: ctx.StringValue(),
		Sources: out,
	}
}
