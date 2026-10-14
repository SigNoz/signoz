package aiobservabilitytypes

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// formatCase feeds FormatMessages a span document built from attributes, flat dotted keys as the SDK
// set them, plus input and output as gen_ai.input.messages and gen_ai.output.messages.
type formatCase struct {
	name       string
	input      any
	output     any
	attributes map[string]any
	formatter  string
	warnings   []string
	wantInput  string
	wantOutput string
}

func runFormatCases(t *testing.T, testCases []formatCase) {
	t.Helper()
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			attributes := map[string]any{}
			if testCase.input != nil {
				attributes[GenAIInputMessages] = testCase.input
			}
			if testCase.output != nil {
				attributes[GenAIOutputMessages] = testCase.output
			}
			for key, value := range testCase.attributes {
				attributes[key] = value
			}
			formatted := FormatMessages(document(attributes))
			assert.Equal(t, testCase.formatter, formatted.Formatter)
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
			formatter: FormatterText,
			warnings:  []string{"bare user text, role assumed", "bare assistant text, role assumed"},
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
			formatter:  FormatterGeneric,
			warnings:   []string{"message format not recognised, kept as generic"},
			wantInput:  `[{"role": "", "parts": [{"type": "generic", "content": "{\"city\":\"Paris\",\"temp_c\":21}"}]}]`,
			wantOutput: `[]`,
		},
		{
			name:       "NoMessageAttributes_EmptyListsNoFormatter",
			attributes: map[string]any{GenAIRequestModel: "gpt-4o", GenAIToolName: "get_weather"},
			wantInput:  `[]`,
			wantOutput: `[]`,
		},
		{
			name:       "NilDocument_EmptyListsNoFormatter",
			wantInput:  `[]`,
			wantOutput: `[]`,
		},
	})
}

func TestAttribute(t *testing.T) {
	arguments := map[string]any{"city": "Paris", "days": []any{1.0, 2.0}}
	testCases := []struct {
		name string
		doc  map[string]any
		key  string
		want any
	}{
		{name: "Object_ReturnedWhole", doc: document(map[string]any{"gen_ai.tool.call.arguments": arguments}), key: GenAIToolCallArguments, want: arguments},
		{name: "MissingPath_Nil", doc: document(map[string]any{"gen_ai.tool.name": "get_weather"}), key: GenAIToolCallArguments},
		{name: "ScalarAtPrefix_Nil", doc: document(map[string]any{"gen_ai.tool.call": "x"}), key: GenAIToolCallArguments},
		{name: "NilDocument_Nil", key: GenAIToolCallArguments},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, attribute(testCase.doc, testCase.key))
		})
	}
}
