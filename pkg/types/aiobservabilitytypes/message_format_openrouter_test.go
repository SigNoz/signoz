package aiobservabilitytypes

import "testing"

// Captured cases are gen_ai.input.messages and gen_ai.output.messages as the collector stored them for
// the SigNoz/scripts openrouter-gateway capture, LLM Generation spans.
func TestFormat_OpenRouter(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// the completion is the tool name followed by the JSON arguments
			name:       "CompletionIsToolNameAndArguments_ToolCallPart",
			input:      `{"messages":[{"role":"user","content":"What's the weather in Bengaluru? Use the tool."}]}`,
			output:     `{"completion":"get_current_weather{\"city\":\"Bengaluru\"}","reasoning":null,"tools":[{"type":"function","function":{"name":"get_current_weather","description":"Get the current weather for a city.","parameters":{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}}}],"rawRequest":{"model":"openai/gpt-4o-mini","max_tokens":80,"tool_choice":"auto"}}`,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "What's the weather in Bengaluru? Use the tool."}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_current_weather", "arguments": {"city": "Bengaluru"}}], "finish_reason": "tool_call"}]`,
		},
		{
			name:   "CompletionWithReasoning_ReasoningThenText",
			input:  `{"messages":[{"role":"system","content":"You are concise."},{"role":"user","content":"Say hello in five words."}]}`,
			output: `{"completion":"Hello there, how are you?","reasoning":"A greeting of exactly five words.","tools":[],"rawRequest":{"model":"openai/gpt-4o-mini"}}`,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are concise."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Say hello in five words."}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "reasoning", "content": "A greeting of exactly five words."}, {"type": "text", "content": "Hello there, how are you?"}]}]`,
		},
		{
			// a completion that only starts with a tool name stays text
			name:       "CompletionStartsWithToolNameButNoArguments_Text",
			output:     `{"completion":"get_current_weather is the tool to call.","reasoning":null,"tools":[{"type":"function","function":{"name":"get_current_weather"}}]}`,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "get_current_weather is the tool to call."}]}]`,
		},
	})
}
