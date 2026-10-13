package aiobservabilitytypes

import "testing"

// Captured cases are the gen_ai.prompt.N.* and gen_ai.completion.N.* keys as the collector stored
// them for the SigNoz/scripts crewai, mistral and litellm captures.
func TestFormat_Traceloop(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// crewai capture, openai.chat span of the tool round (opentelemetry.instrumentation.openai.v1)
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
			formatter: FormatterTraceloop,
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
			formatter: FormatterTraceloop,
			wantInput: `[{"role": "user", "parts": [{"type": "text", "content": "What's the weather in Paris and in London?"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Paris"}},
			  {"type": "tool_call", "name": "get_weather", "id": "call_2", "arguments": {"city": "London"}}
			], "finish_reason": "tool_call"}]`,
		},
		{
			// mistral capture, mistralai.chat span: the instrumentation writes the role without the content
			name: "RoleWithoutContent_EmptyMessageWarns",
			attributes: map[string]any{
				"gen_ai.prompt.0.role":              "user",
				"gen_ai.completion.0.role":          "assistant",
				"gen_ai.completion.0.finish_reason": "stop",
				"gen_ai.completion.0.content":       "Observability is the ability to understand a system's internal state by analyzing its external outputs.",
			},
			formatter:  FormatterTraceloop,
			warnings:   []string{"message 0 has no content"},
			wantInput:  `[{"role": "user", "parts": []}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Observability is the ability to understand a system's internal state by analyzing its external outputs."}], "finish_reason": "stop"}]`,
		},
		{
			// a vision prompt: the content is the JSON of the OpenAI content block list
			name: "ContentBlockList_TextAndBlobParts",
			attributes: map[string]any{
				"gen_ai.prompt.0.role":    "user",
				"gen_ai.prompt.0.content": `[{"type":"text","text":"What animal is this?"},{"type":"image_url","image_url":{"url":"data:image/jpeg;base64,/9j/4AAQ"}}]`,
			},
			formatter: FormatterTraceloop,
			wantInput: `[{"role": "user", "parts": [
			  {"type": "text", "content": "What animal is this?"},
			  {"type": "blob", "modality": "image", "mime_type": "image/jpeg", "content": "/9j/4AAQ"}
			]}]`,
			wantOutput: `[]`,
		},
		{
			// litellm capture, litellm_request span: the semconv output lost the tool call, the flattened
			// completion keys beside it still have it
			name: "SemconvEmptyPartsWithLegacyFunctionCall_ToolCallFilledIn",
			attributes: map[string]any{
				GenAIInputMessages:                            `[{"role": "user", "parts": [{"type": "text", "content": "What is the weather in Bengaluru in celsius?"}]}]`,
				GenAIOutputMessages:                           `[{"role": "assistant", "parts": [], "finish_reason": "tool_calls"}]`,
				"gen_ai.completion.0.function_call.name":      "get_current_weather",
				"gen_ai.completion.0.function_call.arguments": `{"city":"Bengaluru"}`,
			},
			formatter:  FormatterSemconv,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "What is the weather in Bengaluru in celsius?"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_current_weather", "arguments": {"city": "Bengaluru"}}], "finish_reason": "tool_call"}]`,
		},
	})
}
