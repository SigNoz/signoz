package implspanmapper

import (
	"bytes"
	"fmt"
	"sort"

	"github.com/SigNoz/signoz/pkg/types/spantypes"
	"gopkg.in/yaml.v3"
)

const processorName = "signozspanmappingprocessor"

const (
	// Collector context values (see signozspanmappingprocessor.ContextAttributes/ContextResource).
	ctxAttributes = "attributes"
	ctxResource   = "resource"

	// Collector action values.
	actionCopy = "copy"
	actionMove = "move"

	// Source key prefix the collector treats as "read from resource".
	resourcePrefix = "resource."
)

// enabledGroup pairs an enabled group with its enabled mappers.
type enabledGroup struct {
	group   *spantypes.SpanMapperGroup
	mappers []*spantypes.SpanMapper
}

// buildProcessorConfig converts enabled groups + mappers into the
// signozspanmappingprocessor config shape.
func buildProcessorConfig(groups []enabledGroup) *spantypes.SpanMappingProcessorConfig {
	out := make([]spantypes.SpanMappingGroup, 0, len(groups))

	for _, eg := range groups {
		rules := make([]spantypes.SpanMappingAttribute, 0, len(eg.mappers))
		for _, m := range eg.mappers {
			rules = append(rules, buildAttributeRule(m))
		}

		out = append(out, spantypes.SpanMappingGroup{
			ID: eg.group.Name,
			ExistsAny: spantypes.SpanMappingExistsAny{
				Attributes: eg.group.Condition.Attributes,
				Resource:   eg.group.Condition.Resource,
			},
			Attributes: rules,
		})
	}

	return &spantypes.SpanMappingProcessorConfig{Groups: out}
}

// buildAttributeRule maps a single SpanMapper to a collector AttributeRule.
// Sources are sorted by Priority DESC (highest-priority first), and read-from-
// resource sources are encoded via the "resource." prefix. The rule-level
// action is derived from the sources' operations (all sources within one
// mapper are expected to share the same operation; the highest-priority
// source's operation is used).
func buildAttributeRule(m *spantypes.SpanMapper) spantypes.SpanMappingAttribute {
	sources := make([]spantypes.SpanMapperSource, len(m.Config.Sources))
	copy(sources, m.Config.Sources)
	sort.SliceStable(sources, func(i, j int) bool { return sources[i].Priority > sources[j].Priority })

	keys := make([]string, 0, len(sources))
	for _, s := range sources {
		if s.Context == spantypes.FieldContextResource {
			keys = append(keys, resourcePrefix+s.Key)
		} else {
			keys = append(keys, s.Key)
		}
	}

	action := actionCopy
	if len(sources) > 0 && sources[0].Operation == spantypes.SpanMapperOperationMove {
		action = actionMove
	}

	ctx := ctxAttributes
	if m.FieldContext == spantypes.FieldContextResource {
		ctx = ctxResource
	}

	return spantypes.SpanMappingAttribute{
		Target:  m.Name,
		Context: ctx,
		Action:  action,
		Sources: keys,
	}
}

// generateCollectorConfigWithSpanMapping injects (or replaces) the
// signozspanmappingprocessor block in the collector YAML. Pipeline wiring is
// handled by the collector's baseline config, not here.
func generateCollectorConfigWithSpanMapping(
	currentConfYaml []byte,
	groups []enabledGroup,
) ([]byte, error) {
	// Empty input: nothing to inject into. Pass through unchanged so we don't
	// turn it into "null\n" or fail on yaml.v3's EOF.
	if len(bytes.TrimSpace(currentConfYaml)) == 0 {
		return currentConfYaml, nil
	}

	var collectorConf map[string]any
	if err := yaml.Unmarshal(currentConfYaml, &collectorConf); err != nil {
		return nil, fmt.Errorf("failed to unmarshal collector config: %w", err)
	}
	if collectorConf == nil {
		collectorConf = map[string]any{}
	}

	processors := map[string]any{}
	if collectorConf["processors"] != nil {
		if p, ok := collectorConf["processors"].(map[string]any); ok {
			processors = p
		}
	}

	procConfig := buildProcessorConfig(groups)
	configBytes, err := yaml.Marshal(procConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal span attr mapping processor config: %w", err)
	}
	var configMap any
	if err := yaml.Unmarshal(configBytes, &configMap); err != nil {
		return nil, fmt.Errorf("failed to re-unmarshal span attr mapping processor config: %w", err)
	}

	processors[processorName] = configMap
	collectorConf["processors"] = processors

	return yaml.Marshal(collectorConf)
}
