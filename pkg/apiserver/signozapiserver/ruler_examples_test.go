package signozapiserver

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// TestPostableRuleExamplesValidate verifies every example payload returned by
// postableRuleExamples() round-trips through PostableRule.UnmarshalJSON and
// passes Validate(). If an example drifts from the runtime contract this
// breaks loudly so the spec doesn't ship invalid payloads to users.
func TestPostableRuleExamplesValidate(t *testing.T) {
	for _, example := range postableRuleExamples() {
		t.Run(example.Name, func(t *testing.T) {
			raw, err := json.Marshal(example.Value)
			if err != nil {
				t.Fatalf("marshal example: %v", err)
			}

			var rule ruletypes.PostableRule
			if err := json.Unmarshal(raw, &rule); err != nil {
				t.Fatalf("unmarshal: %v\npayload: %s", err, raw)
			}

			if err := rule.Validate(); err != nil {
				t.Fatalf("Validate: %v\npayload: %s", err, raw)
			}
		})
	}
}
