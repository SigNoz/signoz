package spantypes

import (
	"sort"
	"strings"

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

	// Defining the processor under `processors` is not enough: the collector only
	// runs a processor that also appears in a pipeline's processor list. Wire it
	// into service.pipelines.traces.processors (ahead of `batch`), mirroring the
	// logs pipeline builder in logparsingpipeline/collector_config.go:187.
	insertProcessorIntoTracesPipeline(collectorConf, ProcessorName)

	out, err := yaml.Marshal(collectorConf)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, ErrCodeBuildMappingProcessorConfig, "failed to marshal collector config")
	}
	return out, nil
}

// insertProcessorIntoTracesPipeline adds processorName to
// service.pipelines.traces.processors so the collector actually executes it.
// The processor is placed immediately before the first `batch` processor
// (so it runs before spans are batched and exported), and the call is
// idempotent: if the processor is already listed the pipeline is unchanged.
// If there is no traces pipeline, the config is left untouched.
func insertProcessorIntoTracesPipeline(collectorConf map[string]any, processorName string) {
	service, ok := collectorConf["service"].(map[string]any)
	if !ok {
		return
	}
	pipelines, ok := service["pipelines"].(map[string]any)
	if !ok {
		return
	}
	traces, ok := pipelines["traces"].(map[string]any)
	if !ok {
		return
	}

	existing, ok := traces["processors"].([]any)
	if !ok && traces["processors"] != nil {
		// `processors` is present but not a sequence; leave it rather than clobber.
		return
	}

	for _, p := range existing {
		if name, ok := p.(string); ok && name == processorName {
			return // already wired
		}
	}

	updated := make([]any, 0, len(existing)+1)
	placed := false
	for _, p := range existing {
		if name, ok := p.(string); ok && !placed &&
			(name == "batch" || strings.HasPrefix(name, "batch/")) {
			updated = append(updated, processorName)
			placed = true
		}
		updated = append(updated, p)
	}
	if !placed {
		updated = append(updated, processorName)
	}
	traces["processors"] = updated
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
// Sources are sorted by Priority DESC (highest-priority first); read-from-
// resource sources are encoded via the "resource." prefix on the key. Each
// source carries its own action — "copy" is omitted to keep the emitted YAML
// compact, and only "move" is set explicitly.
func buildAttributeRule(m *SpanMapper) spanMapperProcessorAttribute {
	sources := make([]SpanMapperSource, len(m.Config.Sources))
	copy(sources, m.Config.Sources)
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
