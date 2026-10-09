package genaiformatter

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// formatCase holds the two raw attribute values and the formatted view expected for them.
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

// The captured cases are gen_ai.input.messages and gen_ai.output.messages as the collector stored
// them for the SigNoz/scripts static-telemetry-generator captures; the image data URL is trimmed.
func TestFormat(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			name:      "Litellm_Semconv",
			input:     `[{"role": "system", "parts": [{"type": "text", "content": "You are a concise assistant."}]}, {"role": "user", "parts": [{"type": "text", "content": "Give me a one-line definition of observability."}]}]`,
			output:    `[{"role": "assistant", "parts": [{"type": "text", "content": "Observability is the ability to understand the internal state of a system based on external outputs, enabling effective monitoring and troubleshooting."}], "finish_reason": "stop"}]`,
			formatter: FormatterSemconv,
			wantInput: `[
			  {
			    "role": "system",
			    "parts": [
			      {
			        "type": "text",
			        "content": "You are a concise assistant."
			      }
			    ]
			  },
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "Give me a one-line definition of observability."
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
			        "content": "Observability is the ability to understand the internal state of a system based on external outputs, enabling effective monitoring and troubleshooting."
			      }
			    ],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			name:      "Litellm_TextKeyAndImageBlock",
			input:     `[{"role": "user", "parts": [{"type": "text", "text": "What animal is in this image? One sentence."}, {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD"}}]}]`,
			output:    `[{"role": "assistant", "parts": [{"type": "text", "content": "The animal in the image is a cartoon duck."}], "finish_reason": "stop"}]`,
			formatter: FormatterSemconv,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "What animal is in this image? One sentence."
			      },
			      {
			        "type": "blob",
			        "modality": "image",
			        "content": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD",
			        "mime_type": "image/jpeg"
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
			        "content": "The animal in the image is a cartoon duck."
			      }
			    ],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			name:      "Langchain_SemconvToolTurn",
			input:     `[{"role": "user", "parts": [{"type": "text", "content": "Search for SigNoz AI observability docs, then tell me the weather in Bengaluru."}]}, {"role": "assistant", "parts": [{"type": "tool_call", "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd", "name": "search_web", "arguments": {"query": "SigNoz AI observability documentation"}}, {"type": "tool_call", "id": "call_nkVdZ8xX8d17HtmVddbUgJUc", "name": "get_weather", "arguments": {"city": "Bengaluru"}}]}, {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd", "response": "{\"query\": \"SigNoz AI observability documentation\", \"results\": [{\"title\": \"SigNoz docs: AI observability\", \"snippet\": \"...\"}, {\"title\": \"OpenTelemetry GenAI conventions\", \"snippet\": \"...\"}]}"}]}, {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_nkVdZ8xX8d17HtmVddbUgJUc", "response": "{\"city\": \"Bengaluru\", \"temp_c\": 18, \"summary\": \"Clear\"}"}]}]`,
			output:    `[{"role": "assistant", "parts": [{"type": "text", "content": "I found some results for the SigNoz AI observability documentation. Here's one of the titles you might be interested in:\n\n- **SigNoz docs: AI observability**\n\nUnfortunately, a snippet was not provided, but you can look it up directly for more details.\n\nAs for the weather in Bengaluru, it's currently 18\u00b0C and clear."}], "finish_reason": "stop"}]`,
			formatter: FormatterSemconv,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "Search for SigNoz AI observability docs, then tell me the weather in Bengaluru."
			      }
			    ]
			  },
			  {
			    "role": "assistant",
			    "parts": [
			      {
			        "type": "tool_call",
			        "name": "search_web",
			        "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd",
			        "arguments": {
			          "query": "SigNoz AI observability documentation"
			        }
			      },
			      {
			        "type": "tool_call",
			        "name": "get_weather",
			        "id": "call_nkVdZ8xX8d17HtmVddbUgJUc",
			        "arguments": {
			          "city": "Bengaluru"
			        }
			      }
			    ]
			  },
			  {
			    "role": "tool",
			    "parts": [
			      {
			        "type": "tool_call_response",
			        "response": "{\"query\": \"SigNoz AI observability documentation\", \"results\": [{\"title\": \"SigNoz docs: AI observability\", \"snippet\": \"...\"}, {\"title\": \"OpenTelemetry GenAI conventions\", \"snippet\": \"...\"}]}",
			        "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd"
			      }
			    ]
			  },
			  {
			    "role": "tool",
			    "parts": [
			      {
			        "type": "tool_call_response",
			        "response": "{\"city\": \"Bengaluru\", \"temp_c\": 18, \"summary\": \"Clear\"}",
			        "id": "call_nkVdZ8xX8d17HtmVddbUgJUc"
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
			        "content": "I found some results for the SigNoz AI observability documentation. Here's one of the titles you might be interested in:\n\n- **SigNoz docs: AI observability**\n\nUnfortunately, a snippet was not provided, but you can look it up directly for more details.\n\nAs for the weather in Bengaluru, it's currently 18°C and clear."
			      }
			    ],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			name:  "Bifrost_HTTPBareStrings",
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
			name:       "Semconv_StructuredValue",
			input:      []any{map[string]any{"role": "user", "parts": []any{map[string]any{"type": "text", "content": "hi"}}}},
			formatter:  FormatterSemconv,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[]`,
		},
		{
			name:       "UnknownObject_Generic",
			input:      `{"city": "Paris", "temp_c": 21}`,
			formatter:  FormatterGeneric,
			warnings:   []string{"message format not recognised, kept as generic"},
			wantInput:  `[{"role": "", "parts": [{"type": "generic", "content": "{\"city\":\"Paris\",\"temp_c\":21}"}]}]`,
			wantOutput: `[]`,
		},
		{
			name:       "Absent_Empty",
			wantInput:  `[]`,
			wantOutput: `[]`,
		},
	})
}
