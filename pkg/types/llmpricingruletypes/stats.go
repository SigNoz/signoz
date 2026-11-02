package llmpricingruletypes

// NewStatsFromRules reports the rules users added themselves and the synced
// defaults users pinned.
func NewStatsFromRules(rules []*LLMPricingRule) map[string]any {
	custom, overrides := int64(0), int64(0)
	for _, rule := range rules {
		switch {
		case rule.SourceID == nil:
			custom++
		case rule.IsOverride:
			overrides++
		}
	}

	return map[string]any{
		"llmpricingrule.custom.count":   custom,
		"llmpricingrule.override.count": overrides,
	}
}

func NewStatsFromUnmappedModels(unmapped []*UnmappedModel) map[string]any {
	return map[string]any{"llmpricingrule.unmapped_model.count": int64(len(unmapped))}
}
