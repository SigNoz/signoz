package llmpricingruletypes

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestNewStatsFromRules(t *testing.T) {
	sourceID := valuer.GenerateUUID()

	testCases := []struct {
		name  string
		rules []*LLMPricingRule
		want  map[string]any
	}{
		{
			name: "NoRules",
			want: map[string]any{
				"llmpricingrule.custom.count":   int64(0),
				"llmpricingrule.override.count": int64(0),
			},
		},
		{
			name: "CustomPinnedAndSyncedRules_CountedSeparately",
			rules: []*LLMPricingRule{
				{IsOverride: true},
				{IsOverride: false},
				{SourceID: &sourceID, IsOverride: true},
				{SourceID: &sourceID, IsOverride: false},
			},
			want: map[string]any{
				"llmpricingrule.custom.count":   int64(2),
				"llmpricingrule.override.count": int64(1),
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, NewStatsFromRules(testCase.rules))
		})
	}
}

func TestNewStatsFromModels(t *testing.T) {
	rules := []*LLMPricingRule{{ModelPattern: StringSlice{"gpt-*"}}}

	testCases := []struct {
		name   string
		models []string
		want   int64
	}{
		{name: "NoModels", want: 0},
		{name: "PricedAndUnpricedModels_UnpricedCounted", models: []string{"gpt-5-nano", "claude-haiku-5-5", "gemini-3"}, want: 2},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, map[string]any{"llmpricingrule.unmapped_model.count": testCase.want}, NewStatsFromModels(testCase.models, rules))
		})
	}
}
