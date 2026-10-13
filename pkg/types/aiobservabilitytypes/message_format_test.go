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
			        "content": "Let the cost of the ball be x dollars. Then the bat costs x + $1.00. According to the problem:\n\n  x + (x + 1.00) = 1.10\n\nCombine like terms:\n\n  2x + 1.00 = 1.10\n\nSubtract 1.00 from both sides:\n\n  2x = 0.10\n\nDivide by 2:\n\n  x = 0.05\n\nSo, the ball costs 5 cents."
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

func TestIndexed(t *testing.T) {
	testCases := []struct {
		name string
		doc  map[string]any
		want []map[string]any
	}{
		{
			name: "NumericKeys_SortedNumerically",
			doc:  document(map[string]any{"llm.input_messages.10.message.role": "user", "llm.input_messages.2.message.role": "system", "llm.input_messages.x.message.role": "skipped"}),
			want: []map[string]any{{"message": map[string]any{"role": "system"}}, {"message": map[string]any{"role": "user"}}},
		},
		{
			name: "StructuredList_KeptInOrder",
			doc:  map[string]any{"llm": map[string]any{"input_messages": []any{map[string]any{"message": "b"}, map[string]any{"message": "a"}, "not an object"}}},
			want: []map[string]any{{"message": "b"}, {"message": "a"}},
		},
		{name: "Absent_Empty", doc: map[string]any{}, want: []map[string]any{}},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, indexed(testCase.doc, openInferenceInputMessages))
		})
	}
}

func TestFinishReason(t *testing.T) {
	testCases := []struct {
		name  string
		value string
		want  string
	}{
		{name: "Enum_Kept", value: "stop", want: "stop"},
		{name: "OpenAI_ToolCalls", value: "tool_calls", want: "tool_call"},
		{name: "Anthropic_ToolUse", value: "tool_use", want: "tool_call"},
		{name: "Anthropic_EndTurn", value: "end_turn", want: "stop"},
		{name: "Gemini_UpperCase", value: "MAX_TOKENS", want: "length"},
		{name: "Gemini_Safety", value: "SAFETY", want: "content_filter"},
		{name: "Responses_Incomplete", value: "incomplete", want: "error"},
		{name: "Unknown_KeptLowercase", value: "Something_New", want: "something_new"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got := finishReason(testCase.value)
			require.NotNil(t, got)
			assert.Equal(t, testCase.want, got.StringValue())
		})
	}
	assert.Nil(t, finishReason(" "))
}

func TestFormat_SystemInstructions(t *testing.T) {
	input := `[{"role":"system","parts":[{"type":"text","content":"be brief"}]},{"role":"user","parts":[{"type":"text","content":"hi"}]}]`
	runFormatCases(t, []formatCase{
		{
			name:       "DifferentText_Prepended",
			input:      input,
			attributes: map[string]any{GenAISystemInstructions: `[{"type":"text","content":"never joke"}]`},
			formatter:  FormatterSemconv,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "never joke"}]},
			  {"role": "system", "parts": [{"type": "text", "content": "be brief"}]},
			  {"role": "user", "parts": [{"type": "text", "content": "hi"}]}
			]`,
			wantOutput: `[]`,
		},
		{
			name:       "SameText_Skipped",
			input:      input,
			attributes: map[string]any{GenAISystemInstructions: "be brief"},
			formatter:  FormatterSemconv,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "be brief"}]},
			  {"role": "user", "parts": [{"type": "text", "content": "hi"}]}
			]`,
			wantOutput: `[]`,
		},
		{
			name:       "OutputOnly_Prepended",
			output:     `[{"role":"assistant","parts":[{"type":"text","content":"ok"}]}]`,
			attributes: map[string]any{GenAISystemInstructions: "be brief"},
			formatter:  FormatterSemconv,
			wantInput:  `[{"role": "system", "parts": [{"type": "text", "content": "be brief"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "ok"}]}]`,
		},
		{
			// a create_agent span carries instructions alone
			name:       "NoMessages_Nothing",
			attributes: map[string]any{GenAISystemInstructions: "be brief"},
			wantInput:  `[]`,
			wantOutput: `[]`,
		},
	})
}

func TestFormat_FinishReasons(t *testing.T) {
	output := `[{"role":"assistant","parts":[{"type":"text","content":"a"}],"finish_reason":"stop"},{"role":"assistant","parts":[{"type":"text","content":"b"}]}]`
	runFormatCases(t, []formatCase{
		{
			name:       "List_OverridesMessages",
			output:     output,
			attributes: map[string]any{GenAIResponseFinishReasons: []any{"tool_calls", "length"}},
			formatter:  FormatterSemconv,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "a"}], "finish_reason": "tool_call"}, {"role": "assistant", "parts": [{"type": "text", "content": "b"}], "finish_reason": "length"}]`,
		},
		{
			name:       "JSONString_Parsed",
			output:     output,
			attributes: map[string]any{GenAIResponseFinishReasons: `["stop","length"]`},
			formatter:  FormatterSemconv,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "a"}], "finish_reason": "stop"}, {"role": "assistant", "parts": [{"type": "text", "content": "b"}], "finish_reason": "length"}]`,
		},
		{
			name:       "LengthMismatch_LeavesMessages_Warns",
			output:     output,
			attributes: map[string]any{GenAIResponseFinishReasons: "stop"},
			formatter:  FormatterSemconv,
			warnings:   []string{"gen_ai.response.finish_reasons has 1 entries for 2 output messages"},
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "a"}], "finish_reason": "stop"}, {"role": "assistant", "parts": [{"type": "text", "content": "b"}]}]`,
		},
		{
			// vercel capture: a bare string for the single choice, in the provider's spelling
			name:       "BareString_SingleChoice",
			output:     `{"choices":[{"finish_reason":"stop","message":{"role":"assistant","content":"hi"}}]}`,
			attributes: map[string]any{GenAIResponseFinishReasons: "tool-calls"},
			formatter:  FormatterOpenAIChat,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "hi"}], "finish_reason": "tool_call"}]`,
		},
	})
}
