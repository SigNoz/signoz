package llmpricingruletypes

// NewStatsFromRules reports the rules users added themselves,
// synced defaults users pinned, and how many models in use no rule prices.
func NewStatsFromRules(rules []*LLMPricingRule, unmapped []*UnmappedModel) map[string]any {
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
		"llmpricingrule.custom.count":         custom,
		"llmpricingrule.override.count":       overrides,
		"llmpricingrule.unmapped_model.count": int64(len(unmapped)),
	}
}
