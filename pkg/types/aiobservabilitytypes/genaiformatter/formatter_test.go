package genaiformatter

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type formatCase struct {
	name       string
	input      any
	output     any
	formatter  string
	warnings   []string
	wantInput  string
	wantOutput string
}

func runFormatCases(t *testing.T, testCases []formatCase) {
	t.Helper()
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			formatted := Format(testCase.input, testCase.output)
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
			name:       "NoAttributes_EmptyListsNoFormatter",
			wantInput:  `[]`,
			wantOutput: `[]`,
		},
	})
}
