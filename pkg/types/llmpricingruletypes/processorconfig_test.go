package llmpricingruletypes

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

// assertYAMLEqualToFile decodes both sides into any and compares structurally,
// so map key ordering is irrelevant.
func assertYAMLEqualToFile(t *testing.T, name string, actual []byte) {
	t.Helper()
	expected, err := os.ReadFile(filepath.Join("testdata", name))
	require.NoError(t, err)

	var e, a any
	require.NoError(t, yaml.Unmarshal(expected, &e))
	require.NoError(t, yaml.Unmarshal(actual, &a))
	assert.Equal(t, e, a)
}

func makePricingRule(model string, patterns []string, cacheMode LLMPricingRuleCacheMode, costIn, costOut, cacheRead, cacheWrite float64) *LLMPricingRule {
	return &LLMPricingRule{
		Model:        model,
		ModelPattern: StringSlice(patterns),
		Unit:         UnitPerMillionTokens,
		Pricing: LLMRulePricing{
			Input:  costIn,
			Output: costOut,
			Cache: &LLMPricingCacheCosts{
				Mode:  cacheMode,
				Read:  cacheRead,
				Write: cacheWrite,
			},
		},
		Enabled: true,
	}
}

func TestGenerateCollectorConfigWithLLMPricingProcessor(t *testing.T) {
	tests := []struct {
		name         string
		rules        []*LLMPricingRule
		expectedFile string
	}{
		{
			name: "with_rule",
			rules: []*LLMPricingRule{
				makePricingRule("gpt-4o", []string{"gpt-4o*"}, LLMPricingRuleCacheModeSubtract, 5.0, 15.0, 2.5, 0),
			},
			expectedFile: "collector_with_rule.yaml",
		},
		// We deploy the processor even with zero rules so rules can be added
		// later (by a user or by Zeus) without any config-shape change.
		// Pipeline wiring is handled by the collector's baseline config.
		{
			name:         "no_rules",
			rules:        nil,
			expectedFile: "collector_no_rules.yaml",
		},
	}

	input, err := os.ReadFile(filepath.Join("testdata", "collector_baseline.yaml"))
	require.NoError(t, err)

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			out, err := GenerateCollectorConfigWithLLMPricingProcessor(input, tc.rules)
			require.NoError(t, err)
			assertYAMLEqualToFile(t, tc.expectedFile, out)
		})
	}
}

func TestGenerateCollectorConfig_EmptyInputPassthrough(t *testing.T) {
	// yaml.v3 errors on empty/whitespace input; the generator passes such
	// input through unchanged instead.
	rules := []*LLMPricingRule{
		makePricingRule("gpt-4o", []string{"gpt-4o*"}, LLMPricingRuleCacheModeSubtract, 5.0, 15.0, 2.5, 0),
	}

	for _, in := range [][]byte{nil, []byte("   \n")} {
		out, err := GenerateCollectorConfigWithLLMPricingProcessor(in, rules)
		require.NoError(t, err)
		assert.Equal(t, in, out)
	}
}
