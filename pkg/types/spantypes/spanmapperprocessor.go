package spantypes

import (
	"sort"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/goccy/go-yaml"
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
	Target  string   `yaml:"target" json:"target"`
	Context string   `yaml:"context,omitempty" json:"context,omitempty"`
	Action  string   `yaml:"action,omitempty" json:"action,omitempty"`
	Sources []string `yaml:"sources" json:"sources"`
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
	configBytes, err := yaml.Marshal(procConfig)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, ErrCodeBuildMappingProcessorConfig, "failed to marshal span mapper processor config")
	}
	var configMap any
	if err := yaml.Unmarshal(configBytes, &configMap); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, ErrCodeBuildMappingProcessorConfig, "failed to re-unmarshal span mapper processor config")
	}

	processors[ProcessorName] = configMap
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
		rules := make([]spanMapperProcessorAttribute, 0, len(gm.Mappers))
		for _, m := range gm.Mappers {
			rules = append(rules, buildAttributeRule(m))
		}

		out = append(out, spanMapperProcessorGroup{
			ID: gm.Group.Name,
			ExistsAny: spanMapperProcessorExistsAny{
				Attributes: gm.Group.Condition.Attributes,
				Resource:   gm.Group.Condition.Resource,
			},
			Attributes: rules,
		})
	}

	return &spanMapperProcessorConfig{Groups: out}
}

// buildAttributeRule maps a single SpanMapper to a collector attribute rule.
// Sources are sorted by Priority DESC (highest-priority first), and read-from-
// resource sources are encoded via the "resource." prefix.
func buildAttributeRule(m *SpanMapper) spanMapperProcessorAttribute {
	sources := make([]SpanMapperSource, len(m.Config.Sources))
	copy(sources, m.Config.Sources)
	sort.SliceStable(sources, func(i, j int) bool { return sources[i].Priority > sources[j].Priority })

	keys := make([]string, 0, len(sources))
	for _, s := range sources {
		if s.Context == FieldContextResource {
			keys = append(keys, FieldContextResource.StringValue()+"."+s.Key)
		} else {
			keys = append(keys, s.Key)
		}
	}

	action := SpanMapperOperationCopy
	if len(sources) > 0 && sources[0].Operation == SpanMapperOperationMove {
		action = SpanMapperOperationMove
	}

	ctx := FieldContextSpanAttribute
	if m.FieldContext == FieldContextResource {
		ctx = FieldContextResource
	}

	return spanMapperProcessorAttribute{
		Target:  m.Name,
		Context: ctx.StringValue(),
		Action:  action.StringValue(),
		Sources: keys,
	}
}
