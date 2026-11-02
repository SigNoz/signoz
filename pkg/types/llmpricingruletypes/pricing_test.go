package llmpricingruletypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestModelMatchesAnyRule(t *testing.T) {
	opus5 := &LLMPricingRule{ModelPattern: StringSlice{"anthropic/claude-opus-5", "claude-opus-5"}}
	opus55 := &LLMPricingRule{ModelPattern: StringSlice{"anthropic/claude-opus-5.5", "claude-opus-5.5", "claude-opus-5-5"}}
	gpt5 := &LLMPricingRule{ModelPattern: StringSlice{"openai/gpt-5", "gpt-5"}}

	testCases := []struct {
		name  string
		rules []*LLMPricingRule
		model string
		want  bool
	}{
		{name: "ProviderQualifiedModel", rules: []*LLMPricingRule{opus55}, model: "anthropic/claude-opus-5.5", want: true},
		{name: "DatedSnapshot", rules: []*LLMPricingRule{opus55}, model: "claude-opus-5-5-20260921", want: true},
		{name: "SiblingModel_NoMatch", rules: []*LLMPricingRule{gpt5}, model: "gpt-5-mini-2025-08-07", want: false},
		{name: "SecondRuleMatches", rules: []*LLMPricingRule{opus5, opus55}, model: "claude-opus-5-5", want: true},
		{name: "NoRules", rules: nil, model: "claude-opus-5-5", want: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, ModelMatchesAnyRule(testCase.model, testCase.rules))
		})
	}
}
