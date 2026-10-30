package llmpricingruletypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestModelMatchesAnyRule(t *testing.T) {
	opus5 := &LLMPricingRule{ModelPattern: StringSlice{"anthropic/claude-opus-5", "claude-opus-5"}}
	opus55 := &LLMPricingRule{ModelPattern: StringSlice{"anthropic/claude-opus-5.5", "claude-opus-5.5", "claude-opus-5-5"}}
	gpt5 := &LLMPricingRule{ModelPattern: StringSlice{"openai/gpt-5", "gpt-5"}}
	anyGPT4o := &LLMPricingRule{ModelPattern: StringSlice{"gpt-4o*"}}

	testCases := []struct {
		name  string
		rules []*LLMPricingRule
		model string
		want  bool
	}{
		{name: "ExactModel", rules: []*LLMPricingRule{opus55}, model: "claude-opus-5-5", want: true},
		{name: "ProviderQualifiedModel", rules: []*LLMPricingRule{opus55}, model: "anthropic/claude-opus-5.5", want: true},
		{name: "DatedSnapshot", rules: []*LLMPricingRule{opus55}, model: "claude-opus-5-5-20260921", want: true},
		{name: "DashedDate", rules: []*LLMPricingRule{gpt5}, model: "gpt-5-2025-08-07", want: true},
		{name: "LatestAlias", rules: []*LLMPricingRule{opus55}, model: "claude-opus-5-5-latest", want: true},
		{name: "BedrockVersion", rules: []*LLMPricingRule{opus55}, model: "claude-opus-5-5-20260921-v1:0", want: true},
		{name: "VertexVersion", rules: []*LLMPricingRule{opus55}, model: "claude-opus-5-5@20260921", want: true},
		{name: "MinorVersionBump_NoMatch", rules: []*LLMPricingRule{opus5}, model: "claude-opus-5-5", want: false},
		{name: "SiblingModel_NoMatch", rules: []*LLMPricingRule{gpt5}, model: "gpt-5-mini-2025-08-07", want: false},
		{name: "DifferentCase_NoMatch", rules: []*LLMPricingRule{gpt5}, model: "GPT-5", want: false},
		{name: "TrailingStar_MatchesAnySuffix", rules: []*LLMPricingRule{anyGPT4o}, model: "gpt-4o-mini", want: true},
		{name: "SecondRuleMatches", rules: []*LLMPricingRule{opus5, opus55}, model: "claude-opus-5-5", want: true},
		{name: "NoRules", rules: nil, model: "claude-opus-5-5", want: false},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, ModelMatchesAnyRule(testCase.model, testCase.rules))
		})
	}
}
