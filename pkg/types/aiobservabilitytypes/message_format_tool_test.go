package aiobservabilitytypes

import "testing"

// Captured cases are the tool span attributes as the collector stored them for the SigNoz/scripts
// static-telemetry-generator captures, after the span mapper filled the gen_ai.tool.call.* keys.
func TestFormat_Tool(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// gen_ai.tool.call.arguments and gen_ai.tool.call.result written by the langchain instrumentation itself,
			// wrapped in its on_tool_start and on_tool_end payloads:
			// https://github.com/traceloop/openllmetry/blob/93429cfb9767e6b51db6cb35f6b70f758117669a/packages/opentelemetry-instrumentation-langchain/opentelemetry/instrumentation/langchain/callback_handler.py#L837
			name: "LangChainEnvelopes_InputsAndOutputUnwrapped",
			attributes: map[string]any{
				GenAIToolName:          "get_weather",
				GenAIToolCallArguments: `{"input_str": "{'city': 'Bengaluru'}", "tags": [], "metadata": {}, "inputs": {"city": "Bengaluru"}, "kwargs": {"color": "green", "name": null, "tool_call_id": null}}`,
				GenAIToolCallResult:    `{"output": "{\"city\": \"Bengaluru\", \"temp_c\": 18, \"summary\": \"Clear\"}", "kwargs": {"tags": [], "color": "green", "name": "get_weather"}}`,
			},
			wantInput:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "arguments": {"city": "Bengaluru"}}]}]`,
			wantOutput: `[{"role": "tool", "parts": [{"type": "tool_call_response", "response": {"city": "Bengaluru", "temp_c": 18, "summary": "Clear"}}]}]`,
		},
		{
			// traceloop.entity.input and traceloop.entity.output from the @tool decorator, copied by the mapper;
			// the tool returned a JSON string, which json.dumps encoded again:
			// https://github.com/traceloop/openllmetry/blob/93429cfb9767e6b51db6cb35f6b70f758117669a/packages/traceloop-sdk/traceloop/sdk/decorators/base.py#L169
			name: "TraceloopDecorator_KwargsUnwrapped_ResultDecodedTwice",
			attributes: map[string]any{
				GenAIToolName:          "get_weather",
				GenAIToolCallArguments: `{"args": [], "kwargs": {"city": "Bengaluru"}}`,
				GenAIToolCallResult:    `"{\"city\": \"Bengaluru\", \"temp_c\": 28, \"summary\": \"Partly cloudy\"}"`,
			},
			wantInput:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "arguments": {"city": "Bengaluru"}}]}]`,
			wantOutput: `[{"role": "tool", "parts": [{"type": "tool_call_response", "response": {"city": "Bengaluru", "temp_c": 28, "summary": "Partly cloudy"}}]}]`,
		},
		{
			// traceloop.entity.output of a @tool returning None, json.dumps(None), copied by the mapper:
			// https://github.com/traceloop/openllmetry/blob/93429cfb9767e6b51db6cb35f6b70f758117669a/packages/traceloop-sdk/traceloop/sdk/decorators/base.py#L185
			name: "TraceloopDecorator_PositionalArgsOnly_ListKept",
			attributes: map[string]any{
				GenAIToolName:          "lookup",
				GenAIToolCallArguments: `{"args": ["OpenAI", "What's the weather in Paris?"], "kwargs": {}}`,
				GenAIToolCallResult:    `null`,
			},
			wantInput:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "lookup", "arguments": ["OpenAI", "What's the weather in Paris?"]}]}]`,
			wantOutput: `[{"role": "tool", "parts": [{"type": "tool_call_response", "response": null}]}]`,
		},
		{
			name: "TraceloopDecorator_BothArgsAndKwargs_EnvelopeKept",
			attributes: map[string]any{
				GenAIToolName:          "lookup",
				GenAIToolCallArguments: `{"args": ["Paris"], "kwargs": {"unit": "c"}}`,
			},
			wantInput:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "lookup", "arguments": {"args": ["Paris"], "kwargs": {"unit": "c"}}}]}]`,
			wantOutput: `[]`,
		},
		{
			// input.value and output.value of an OpenInference TOOL span, copied by the mapper:
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/traces.md
			name: "OpenInferenceToolSpan_PlainJSONAndText",
			attributes: map[string]any{
				GenAIToolName:          "get_weather",
				GenAIToolCallArguments: `{"city":"Bangalore"}`,
				GenAIToolCallResult:    `27C, partly cloudy, light breeze from the south.`,
			},
			wantInput:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "arguments": {"city": "Bangalore"}}]}]`,
			wantOutput: `[{"role": "tool", "parts": [{"type": "tool_call_response", "response": "27C, partly cloudy, light breeze from the south."}]}]`,
		},
		{
			// ai.toolCall.{id,name,args,result} of a Vercel ai.toolCall span, copied by the mapper:
			// https://ai-sdk.dev/docs/ai-sdk-core/telemetry
			name: "VercelToolCall_IDOnBothParts",
			attributes: map[string]any{
				GenAIToolName:          "get_current_weather",
				GenAIToolCallID:        "call_l0ycKcmt1uPCdGWR4SkwoLBv",
				GenAIToolCallArguments: `{"city":"Bengaluru","unit":"c"}`,
				GenAIToolCallResult:    `{"city":"Bengaluru","unit":"c","temperature":27,"condition":"partly cloudy"}`,
			},
			wantInput:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_current_weather", "id": "call_l0ycKcmt1uPCdGWR4SkwoLBv", "arguments": {"city": "Bengaluru", "unit": "c"}}]}]`,
			wantOutput: `[{"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_l0ycKcmt1uPCdGWR4SkwoLBv", "response": {"city": "Bengaluru", "unit": "c", "temperature": 27, "condition": "partly cloudy"}}]}]`,
		},
		{
			// the object form the OTel registry asks for, whole in the JSON column
			name: "StructuredArguments_ObjectKept",
			attributes: map[string]any{
				GenAIToolName:          "get_weather",
				GenAIToolCallID:        "call_1",
				GenAIToolCallArguments: map[string]any{"city": "Paris", "days": []any{1.0, 2.0}},
			},
			wantInput:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Paris", "days": [1, 2]}}]}]`,
			wantOutput: `[]`,
		},
		{
			// the mapper groups never fill both; the tool call wins when an SDK does
			name: "MessagesBesideToolCall_ToolCallFormatted",
			attributes: map[string]any{
				GenAIInputMessages:     `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
				GenAIToolName:          "lookup",
				GenAIToolCallArguments: `{"city": "Paris"}`,
			},
			wantInput:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "lookup", "arguments": {"city": "Paris"}}]}]`,
			wantOutput: `[]`,
		},
	})
}
