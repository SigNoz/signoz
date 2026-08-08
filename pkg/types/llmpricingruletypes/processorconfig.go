package llmpricingruletypes

import (
	"bytes"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"gopkg.in/yaml.v3"
)

const ProcessorName = "signozllmpricing"

// LLMPricingRuleProcessorConfig is the top-level config for the signozllmpricing
// OTel processor that gets deployed to collectors via OpAMP.
type LLMPricingRuleProcessorConfig struct {
	Attrs          LLMPricingRuleProcessorAttrs          `yaml:"attrs" json:"attrs"`
	DefaultPricing LLMPricingRuleProcessorDefaultPricing `yaml:"default_pricing" json:"default_pricing"`
	OutputAttrs    LLMPricingRuleProcessorOutputAttrs    `yaml:"output_attrs" json:"output_attrs"`
}

// LLMPricingRuleProcessorAttrs maps span attribute names to the processor's input fields.
type LLMPricingRuleProcessorAttrs struct {
	Model      string `yaml:"model" json:"model"`
	In         string `yaml:"in" json:"in"`
	Out        string `yaml:"out" json:"out"`
	CacheRead  string `yaml:"cache_read" json:"cache_read"`
	CacheWrite string `yaml:"cache_write" json:"cache_write"`
}

// LLMPricingRuleProcessorDefaultPricing holds the list of model-specific rules.
type LLMPricingRuleProcessorDefaultPricing struct {
	Rules []LLMPricingRuleProcessor `yaml:"rules" json:"rules"`
}

// LLMPricingRuleProcessor is a single pricing rule inside the processor config.
type LLMPricingRuleProcessor struct {
	Name    string                        `yaml:"name" json:"name"`
	Pattern []string                      `yaml:"pattern" json:"pattern"`
	Cache   *LLMPricingRuleProcessorCache `yaml:"cache,omitempty" json:"cache,omitempty"`
	In      float64                       `yaml:"in" json:"in"`
	Out     float64                       `yaml:"out" json:"out"`
}

// LLMPricingRuleProcessorCache describes how cached tokens are accounted for.
type LLMPricingRuleProcessorCache struct {
	Mode  string  `yaml:"mode,omitempty" json:"mode,omitempty"`
	Read  float64 `yaml:"read" json:"read"`
	Write float64 `yaml:"write" json:"write"`
}

// LLMPricingRuleProcessorOutputAttrs maps the processor's computed cost fields to span attribute names.
type LLMPricingRuleProcessorOutputAttrs struct {
	In         string `yaml:"in" json:"in"`
	Out        string `yaml:"out" json:"out"`
	CacheRead  string `yaml:"cache_read" json:"cache_read"`
	CacheWrite string `yaml:"cache_write" json:"cache_write"`
	Total      string `yaml:"total" json:"total"`
}

// buildProcessorConfig converts pricing rules into the signozllmpricing processor config.
func buildProcessorConfig(rules []*LLMPricingRule) *LLMPricingRuleProcessorConfig {
	pricingRules := make([]LLMPricingRuleProcessor, 0, len(rules))
	for _, r := range rules {
		var cache *LLMPricingRuleProcessorCache
		if r.Pricing.Cache != nil {
			mode := r.Pricing.Cache.Mode.StringValue()
			if mode != LLMPricingRuleCacheModeSubtract.StringValue() && mode != LLMPricingRuleCacheModeAdditive.StringValue() {
				mode = ""
			}
			cache = &LLMPricingRuleProcessorCache{
				Mode:  mode,
				Read:  r.Pricing.Cache.Read,
				Write: r.Pricing.Cache.Write,
			}
		}
		pricingRules = append(pricingRules, LLMPricingRuleProcessor{
			Name:    r.Model,
			Pattern: r.ModelPattern,
			Cache:   cache,
			In:      r.Pricing.Input,
			Out:     r.Pricing.Output,
		})
	}

	return &LLMPricingRuleProcessorConfig{
		Attrs: LLMPricingRuleProcessorAttrs{
			Model:      telemetrytypes.GenAIRequestModel,
			In:         telemetrytypes.GenAIUsageInputTokens,
			Out:        telemetrytypes.GenAIUsageOutputTokens,
			CacheRead:  telemetrytypes.GenAIUsageCacheReadInputTokens,
			CacheWrite: telemetrytypes.GenAIUsageCacheCreationInputTokens,
		},
		DefaultPricing: LLMPricingRuleProcessorDefaultPricing{
			Rules: pricingRules,
		},
		OutputAttrs: LLMPricingRuleProcessorOutputAttrs{
			In:         SignozGenAICostInput,
			Out:        SignozGenAICostOutput,
			CacheRead:  SignozGenAICostCacheRead,
			CacheWrite: SignozGenAICostCacheWrite,
			Total:      telemetrytypes.SignozGenAITotalCost,
		},
	}
}

// GenerateCollectorConfigWithLLMPricingProcessor injects (or replaces) the signozllmpricing
// processor block in the collector YAML with one built from the given rules.
func GenerateCollectorConfigWithLLMPricingProcessor(
	currentConfYaml []byte,
	rules []*LLMPricingRule,
) ([]byte, error) {
	if len(bytes.TrimSpace(currentConfYaml)) == 0 {
		return currentConfYaml, nil
	}

	var collectorConf map[string]any
	if err := yaml.Unmarshal(currentConfYaml, &collectorConf); err != nil {
		return nil, errors.Wrapf(err, errors.TypeInvalidInput, ErrCodeInvalidCollectorConfig, "failed to unmarshal collector config")
	}
	// rare but don't do anything in this case, also means it's just comments.
	if collectorConf == nil {
		return currentConfYaml, nil
	}

	processors := map[string]any{}
	if existing, ok := collectorConf["processors"]; ok && existing != nil {
		p, ok := existing.(map[string]any)
		if !ok {
			return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidCollectorConfig, "collector config 'processors' must be a mapping, got %T", existing)
		}
		processors = p
	}

	processors[ProcessorName] = buildProcessorConfig(rules)
	collectorConf["processors"] = processors

	// Defining the processor under `processors` is not enough: the collector only
	// runs a processor that also appears in a pipeline's processor list. Wire it
	// into service.pipelines.traces.processors (ahead of `batch`), mirroring the
	// logs pipeline builder in logparsingpipeline/collector_config.go:187.
	insertProcessorIntoTracesPipeline(collectorConf, ProcessorName)

	out, err := yaml.Marshal(collectorConf)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, ErrCodeBuildPricingProcessorConf, "failed to marshal llm pricing processor config")
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
