package signozapiserver

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPostableRuleExamplesValidate verifies every example payload returned by
// postableRuleExamples() round-trips through PostableRule.DecodeStrict and
// passes Validate(). If an example drifts from the runtime contract this
// breaks loudly so the spec doesn't ship invalid payloads to users.
func TestPostableRuleExamplesValidate(t *testing.T) {
	for _, example := range postableRuleExamples() {
		t.Run(example.Name, func(t *testing.T) {
			raw, err := json.Marshal(example.Value)
			require.NoError(t, err)

			var rule ruletypes.PostableRule
			require.NoError(t, rule.DecodeStrict(string(raw)), "payload: %s", raw)
			assert.NoError(t, rule.Validate(), "payload: %s", raw)
		})
	}
}
