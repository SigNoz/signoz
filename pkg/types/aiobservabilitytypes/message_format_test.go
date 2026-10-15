package aiobservabilitytypes

import (
	"encoding/json"
	"maps"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type formatCase struct {
	name       string
	input      any
	output     any
	attributes map[string]any // flat dotted keys beside the two message attributes
	warnings   []string
	wantInput  string
	wantOutput string
}

func runFormatCases(t *testing.T, testCases []formatCase) {
	t.Helper()
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			attributes := map[string]any{GenAIInputMessages: testCase.input, GenAIOutputMessages: testCase.output}
			maps.Copy(attributes, testCase.attributes)
			formatted := FormatMessages(document(attributes))
			assert.Equal(t, append([]string{}, testCase.warnings...), formatted.Warnings)

			input, err := json.Marshal(formatted.Input)
			require.NoError(t, err)
			assert.JSONEq(t, testCase.wantInput, string(input))
			output, err := json.Marshal(formatted.Output)
			require.NoError(t, err)
			assert.JSONEq(t, testCase.wantOutput, string(output))
		})
	}
}

// document nests flat dotted keys the way the JSON column stores them.
func document(flat map[string]any) map[string]any {
	doc := map[string]any{}
	for key, value := range flat {
		segments := strings.Split(key, ".")
		current := doc
		for _, segment := range segments[:len(segments)-1] {
			child, ok := current[segment].(map[string]any)
			if !ok {
				child = map[string]any{}
				current[segment] = child
			}
			current = child
		}
		current[segments[len(segments)-1]] = value
	}
	return doc
}

func TestFormat(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// bifrost-gateway capture, HTTP span
			name:  "BareStrings_RolesAssumed_WarnsPerSide",
			input: `A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?`,
			output: `Let the cost of the ball be x dollars. Then the bat costs x + $1.00. According to the problem:

  x + (x + 1.00) = 1.10

Combine like terms:

  2x + 1.00 = 1.10

Subtract 1.00 from both sides:

  2x = 0.10

Divide by 2:

  x = 0.05

So, the ball costs 5 cents.`,
			warnings: []string{"bare user text, role assumed", "bare assistant text, role assumed"},
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?"
			      }
			    ]
			  }
			]`,
			wantOutput: `[
			  {
			    "role": "assistant",
			    "parts": [
			      {
			        "type": "text",
			        "content": "Let the cost of the ball be x dollars. Then the bat costs x + $1.00. According to the problem:\n\n  x + (x + 1.00) = 1.10\n\nCombine like terms:\n\n  2x + 1.00 = 1.10\n\nSubtract 1.00 from both sides:\n\n  2x = 0.10\n\nDivide by 2:\n\n  x = 0.05\n\nSo, the ball costs 5 cents."
			      }
			    ]
			  }
			]`,
		},
		{
			name:       "UnrecognisedObject_GenericPart_Warns",
			input:      `{"city": "Paris", "temp_c": 21}`,
			warnings:   []string{"message format not recognised, kept as generic"},
			wantInput:  `[{"role": "", "parts": [{"type": "generic", "content": "{\"city\":\"Paris\",\"temp_c\":21}"}]}]`,
			wantOutput: `[]`,
		},
		{
			name:       "NoMessageAttributes_EmptyLists",
			attributes: map[string]any{GenAIRequestModel: "gpt-4o", GenAIToolName: "get_weather"},
			wantInput:  `[]`,
			wantOutput: `[]`,
		},
	})
}
