package aiobservabilitytypes

import "testing"

// Captured cases are the gen_ai.prompt.N.* and gen_ai.completion.N.* keys as the collector stored
// them for the SigNoz/scripts crewai, mistral and litellm captures.
func TestFormat_Traceloop(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// crewai capture, openai.chat span of a tool round, as the openai instrumentation 0.45.6 wrote
			// prompts and completions before its semconv rewrite
			// https://github.com/traceloop/openllmetry/blob/af487056a35625a2cff1c17ac83c2c0d90a02bca/packages/opentelemetry-instrumentation-openai/opentelemetry/instrumentation/openai/shared/chat_wrappers.py#L408
			name: "ToolRound_ToolCallAndToolMessages",
			attributes: map[string]any{
				"gen_ai.prompt.0.role":                   "system",
				"gen_ai.prompt.0.content":                "You are Weather Reporter. Call get_weather and summarise the result.",
				"gen_ai.prompt.1.role":                   "user",
				"gen_ai.prompt.1.content":                "Current Task: What's the weather in Bengaluru?",
				"gen_ai.prompt.2.role":                   "assistant",
				"gen_ai.prompt.2.tool_calls.0.id":        "call_bbVgWPe8AMBol7JlAhDkA6R7",
				"gen_ai.prompt.2.tool_calls.0.name":      "get_weather",
				"gen_ai.prompt.2.tool_calls.0.arguments": `{"city":"Bengaluru"}`,
				"gen_ai.prompt.3.role":                   "tool",
				"gen_ai.prompt.3.tool_call_id":           "call_bbVgWPe8AMBol7JlAhDkA6R7",
				"gen_ai.prompt.3.content":                `{"city": "Bengaluru", "temp_c": 18, "summary": "Clear"}`,
				"gen_ai.completion.0.role":               "assistant",
				"gen_ai.completion.0.finish_reason":      "stop",
				"gen_ai.completion.0.content":            "The current weather in Bengaluru is clear with a temperature of 18°C.",
			},
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are Weather Reporter. Call get_weather and summarise the result."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Current Task: What's the weather in Bengaluru?"}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_bbVgWPe8AMBol7JlAhDkA6R7", "arguments": {"city": "Bengaluru"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_bbVgWPe8AMBol7JlAhDkA6R7", "response": {"city": "Bengaluru", "temp_c": 18, "summary": "Clear"}}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "The current weather in Bengaluru is clear with a temperature of 18°C."}], "finish_reason": "stop"}]`,
		},
		{
			// crewai capture, openai.chat span answering with two tool calls
			// https://github.com/traceloop/openllmetry/blob/af487056a35625a2cff1c17ac83c2c0d90a02bca/packages/opentelemetry-instrumentation-openai/opentelemetry/instrumentation/openai/shared/chat_wrappers.py#L460
			name: "CompletionToolCalls_ToolCallParts",
			attributes: map[string]any{
				"gen_ai.prompt.0.role":                       "user",
				"gen_ai.prompt.0.content":                    "What's the weather in Paris and in London?",
				"gen_ai.completion.0.role":                   "assistant",
				"gen_ai.completion.0.finish_reason":          "tool_calls",
				"gen_ai.completion.0.tool_calls.0.id":        "call_1",
				"gen_ai.completion.0.tool_calls.0.name":      "get_weather",
				"gen_ai.completion.0.tool_calls.0.arguments": `{"city":"Paris"}`,
				"gen_ai.completion.0.tool_calls.1.id":        "call_2",
				"gen_ai.completion.0.tool_calls.1.name":      "get_weather",
				"gen_ai.completion.0.tool_calls.1.arguments": `{"city":"London"}`,
			},
			wantInput: `[{"role": "user", "parts": [{"type": "text", "content": "What's the weather in Paris and in London?"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Paris"}},
			  {"type": "tool_call", "name": "get_weather", "id": "call_2", "arguments": {"city": "London"}}
			], "finish_reason": "tool_call"}]`,
		},
		{
			// mistral capture, mistralai.chat span: the instrumentation writes the role for every message but
			// drops a content that is not a plain string
			// https://github.com/traceloop/openllmetry/blob/4643b8826a6e6a4ce1968178d6ac9ca3ce607e2e/packages/opentelemetry-instrumentation-mistralai/opentelemetry/instrumentation/mistralai/__init__.py#L75
			// https://github.com/traceloop/openllmetry/blob/4643b8826a6e6a4ce1968178d6ac9ca3ce607e2e/packages/opentelemetry-instrumentation-mistralai/opentelemetry/instrumentation/mistralai/__init__.py#L88
			name: "RoleWithoutContent_EmptyMessageWarns",
			attributes: map[string]any{
				"gen_ai.prompt.0.role":              "user",
				"gen_ai.completion.0.role":          "assistant",
				"gen_ai.completion.0.finish_reason": "stop",
				"gen_ai.completion.0.content":       "Observability is the ability to understand a system's internal state by analyzing its external outputs.",
			},
			warnings:   []string{"message 0 has no content"},
			wantInput:  `[{"role": "user", "parts": []}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Observability is the ability to understand a system's internal state by analyzing its external outputs."}], "finish_reason": "stop"}]`,
		},
		{
			// a vision prompt: list content is written as its JSON, the OpenAI content block list
			// https://github.com/traceloop/openllmetry/blob/af487056a35625a2cff1c17ac83c2c0d90a02bca/packages/opentelemetry-instrumentation-openai/opentelemetry/instrumentation/openai/shared/chat_wrappers.py#L431
			name: "ContentBlockList_TextAndBlobParts",
			attributes: map[string]any{
				"gen_ai.prompt.0.role":    "user",
				"gen_ai.prompt.0.content": `[{"type":"text","text":"What animal is this?"},{"type":"image_url","image_url":{"url":"data:image/jpeg;base64,/9j/4AAQ"}}]`,
			},
			wantInput: `[{"role": "user", "parts": [
			  {"type": "text", "content": "What animal is this?"},
			  {"type": "blob", "modality": "image", "mime_type": "image/jpeg", "content": "/9j/4AAQ"}
			]}]`,
			wantOutput: `[]`,
		},
		{
			// litellm capture, litellm_request span: the semconv output has no tool call parts; the
			// gen_ai.completion.N.function_call keys, one N per tool call, carry them
			// https://github.com/BerriAI/litellm/blob/9d72bae336ec0d14c41651adcb0d2e1149721f46/litellm/integrations/opentelemetry.py#L2369
			name: "SemconvEmptyParts_ParallelToolCallsFromCompletionKeys",
			attributes: map[string]any{
				GenAIInputMessages:                            `[{"role": "user", "parts": [{"type": "text", "content": "What's the weather in Paris and in London? Use the tool for each."}]}]`,
				GenAIOutputMessages:                           `[{"role": "assistant", "parts": [], "finish_reason": "tool_calls"}]`,
				"gen_ai.completion.0.function_call.name":      "get_current_weather",
				"gen_ai.completion.0.function_call.arguments": `{"city": "Paris"}`,
				"gen_ai.completion.1.function_call.name":      "get_current_weather",
				"gen_ai.completion.1.function_call.arguments": `{"city": "London"}`,
			},
			wantInput: `[{"role": "user", "parts": [{"type": "text", "content": "What's the weather in Paris and in London? Use the tool for each."}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "tool_call", "name": "get_current_weather", "arguments": {"city": "Paris"}},
			  {"type": "tool_call", "name": "get_current_weather", "arguments": {"city": "London"}}
			], "finish_reason": "tool_call"}]`,
		},
		{
			name: "SemconvTextPart_ToolCallFromCompletionKeysAdded",
			attributes: map[string]any{
				GenAIOutputMessages:                           `[{"role": "assistant", "parts": [{"type": "text", "content": "Let me check."}], "finish_reason": "tool_calls"}]`,
				"gen_ai.completion.0.function_call.name":      "get_weather",
				"gen_ai.completion.0.function_call.arguments": `{"city": "Paris"}`,
			},
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Let me check."}, {"type": "tool_call", "name": "get_weather", "arguments": {"city": "Paris"}}], "finish_reason": "tool_call"}]`,
		},
	})
}
