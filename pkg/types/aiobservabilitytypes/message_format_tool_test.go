package aiobservabilitytypes

import "testing"

// Captured cases are the tool span attributes as the collector stored them for the SigNoz/scripts
// static-telemetry-generator captures, after the span mapper filled the gen_ai.tool.call.* keys.
func TestFormat_Tool(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// langchain capture, execute_tool get_weather span; opentelemetry-instrumentation-langchain
			// callback_handler.py on_tool_start/on_tool_end envelopes
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
			// openllmetry capture, get_weather.tool span; traceloop-sdk decorators/base.py
			// _handle_span_input {args, kwargs} and the result encoded as a JSON string twice
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
			// a decorated function returning None is json.dumps(None); the openllmetry capture shows it on
			// workflow spans, with this positional-args input
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
			// openinference-openai-agents capture, get_weather TOOL span: input.value and output.value
			// copied by the mapper (Arize-ai/openinference@12f2cc03, spec/traces.md)
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
			// vercel capture, ai.toolCall span: ai.toolCall.{id,name,args,result} copied by the mapper
			// (https://ai-sdk.dev/docs/ai-sdk-core/telemetry)
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
