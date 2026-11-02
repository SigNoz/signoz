package llmpricingruletypes

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/SigNoz/signoz/pkg/valuer"
)

func TestNewStatsFromRules(t *testing.T) {
	sourceID := valuer.GenerateUUID()

	testCases := []struct {
		name     string
		rules    []*LLMPricingRule
		unmapped []*UnmappedModel
		want     map[string]any
	}{
		{
			name: "NoRules_NoModels",
			want: map[string]any{
				"llmpricingrule.custom.count":         int64(0),
				"llmpricingrule.override.count":       int64(0),
				"llmpricingrule.unmapped_model.count": int64(0),
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
			unmapped: []*UnmappedModel{{ModelName: "gpt-5-nano"}, {ModelName: "claude-haiku-5-5"}},
			want: map[string]any{
				"llmpricingrule.custom.count":         int64(2),
				"llmpricingrule.override.count":       int64(1),
				"llmpricingrule.unmapped_model.count": int64(2),
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, NewStatsFromRules(testCase.rules, testCase.unmapped))
		})
	}
}
