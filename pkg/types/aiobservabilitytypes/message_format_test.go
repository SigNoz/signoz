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
			// openinference capture, CreateEmbeddings span: the mapper moved the request and the vectors onto
			// the message attributes and copied the span kind onto gen_ai.operation.name
			name:       "EmbeddingsOperation_EmptyLists",
			input:      `{"input": ["observability is the new monitoring"], "model": "text-embedding-3-small"}`,
			output:     `{"data":[{"embedding":[-0.0039,0.0203],"index":0}],"model":"text-embedding-3-small"}`,
			attributes: map[string]any{GenAIOperationName: "EMBEDDING", GenAIRequestModel: "text-embedding-3-small"},
			wantInput:  `[]`,
			wantOutput: `[]`,
		},
		{
			// Langfuse SDK generation: the app passes the request through superjson, the output is the parsed
			// structured output
			name:       "SuperJSONEnvelope_Unwrapped_StructuredOutputGeneric",
			input:      `{"json": {"model": "gpt-4o-mini", "messages": [{"role": "system", "content": "Extract the main article of the page as JSON."}, {"role": "user", "content": "# Council approves new bike lanes"}], "temperature": 0}}`,
			output:     `{"hasArticle": true, "article": {"title": "Council approves new bike lanes"}}`,
			warnings:   []string{"message format not recognised, kept as generic"},
			wantInput:  `[{"role": "system", "parts": [{"type": "text", "content": "Extract the main article of the page as JSON."}]}, {"role": "user", "parts": [{"type": "text", "content": "# Council approves new bike lanes"}]}]`,
			wantOutput: `[{"role": "", "parts": [{"type": "generic", "content": "{\"article\":{\"title\":\"Council approves new bike lanes\"},\"hasArticle\":true}"}]}]`,
		},
		{
			name:       "SuperJSONEnvelopeWithMeta_Unwrapped",
			input:      `{"json": {"messages": [{"role": "user", "content": "What time is it in Oslo?"}]}, "meta": {"values": {"messages.0.at": ["Date"]}}}`,
			output:     `{"json": {"choices": [{"finish_reason": "stop", "message": {"role": "assistant", "content": "It is 14:05 in Oslo."}}]}, "meta": {"values": {}}}`,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "What time is it in Oslo?"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "It is 14:05 in Oslo."}], "finish_reason": "stop"}]`,
		},
		{
			// a json key beside others is a payload of its own, not the envelope
			name:       "JSONKeyBesideOthers_NotUnwrapped_Generic",
			input:      `{"json": {"messages": []}, "schema": "v1"}`,
			warnings:   []string{"message format not recognised, kept as generic"},
			wantInput:  `[{"role": "", "parts": [{"type": "generic", "content": "{\"json\":{\"messages\":[]},\"schema\":\"v1\"}"}]}]`,
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

func TestFormat_SystemInstructions(t *testing.T) {
	input := `[{"role":"user","parts":[{"type":"text","content":"hi"}]}]`
	runFormatCases(t, []formatCase{
		{
			// the langchain instrumentation moves system messages out of the history into gen_ai.system_instructions,
			// a JSON list of parts:
			// https://github.com/traceloop/openllmetry/blob/93429cfb9767e6b51db6cb35f6b70f758117669a/packages/opentelemetry-instrumentation-langchain/opentelemetry/instrumentation/langchain/span_utils.py#L304
			name:       "ListOfParts_LeadsInput",
			input:      input,
			attributes: map[string]any{GenAISystemInstructions: `[{"type": "text", "content": "You are concise."}]`},
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are concise."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "hi"}]}
			]`,
			wantOutput: `[]`,
		},
		{
			// the OpenInference strands processor keeps gen_ai.system_instructions on the span and inserts the
			// same prompt as message 0
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-strands-agents/src/openinference/instrumentation/strands_agents/processor.py#L152
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-strands-agents/src/openinference/instrumentation/strands_agents/processor.py#L293
			name:       "SameTextLeadsInput_Skipped",
			input:      `[{"role":"system","parts":[{"type":"text","content":"You are concise."}]},{"role":"user","parts":[{"type":"text","content":"hi"}]}]`,
			attributes: map[string]any{GenAISystemInstructions: `[{"type": "text", "content": "You are concise."}]`},
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are concise."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "hi"}]}
			]`,
			wantOutput: `[]`,
		},
		{
			name:       "BareString_TextPart",
			input:      input,
			attributes: map[string]any{GenAISystemInstructions: "be brief"},
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "be brief"}]},
			  {"role": "user", "parts": [{"type": "text", "content": "hi"}]}
			]`,
			wantOutput: `[]`,
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
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "a"}], "finish_reason": "tool_call"}, {"role": "assistant", "parts": [{"type": "text", "content": "b"}], "finish_reason": "length"}]`,
		},
		{
			name:       "LengthMismatch_LeavesMessages_Warns",
			output:     output,
			attributes: map[string]any{GenAIResponseFinishReasons: []any{"stop"}},
			warnings:   []string{"gen_ai.response.finish_reasons has 1 entries for 2 output messages"},
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "a"}], "finish_reason": "stop"}, {"role": "assistant", "parts": [{"type": "text", "content": "b"}]}]`,
		},
		{
			// llm.finish_reason copied by the mapper as a bare string, in the Vercel AI SDK spelling:
			// https://github.com/vercel/ai/blob/a5e92fe3c692f8e152fe1eb9ef50a4e734ad0ffb/packages/provider/src/language-model/v2/language-model-v2-finish-reason.ts
			name:       "BareString_SingleChoice",
			output:     `{"choices":[{"finish_reason":"stop","message":{"role":"assistant","content":"hi"}}]}`,
			attributes: map[string]any{GenAIResponseFinishReasons: "tool-calls"},
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "hi"}], "finish_reason": "tool_call"}]`,
		},
	})
}
