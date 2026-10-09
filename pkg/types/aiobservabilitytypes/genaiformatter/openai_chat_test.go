package genaiformatter

import "testing"

func TestFormat_OpenAIChat(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			name: "Chat_RequestAndResponse",
			input: `{
				"model": "gpt-4o",
				"messages": [
					{"role": "system", "content": "You are a weather assistant."},
					{"role": "user", "content": [
						{"type": "text", "text": "What is in this picture, and what is the weather there?"},
						{"type": "image_url", "image_url": {"url": "https://example.com/eiffel.png", "detail": "low"}}
					]}
				],
				"tools": [{"type": "function", "function": {"name": "get_weather"}}]
			}`,
			output: `{
				"id": "chatcmpl-1",
				"choices": [{
					"index": 0,
					"finish_reason": "tool_calls",
					"message": {"role": "assistant", "content": null, "tool_calls": [
						{"id": "call_1", "type": "function", "function": {"name": "get_weather", "arguments": "{\"city\": \"Paris\"}"}}
					]}
				}],
				"usage": {"prompt_tokens": 120, "completion_tokens": 18}
			}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
				{"role": "system", "parts": [{"type": "text", "content": "You are a weather assistant."}]},
				{"role": "user", "parts": [
					{"type": "text", "content": "What is in this picture, and what is the weather there?"},
					{"type": "uri", "modality": "image", "uri": "https://example.com/eiffel.png"}
				]}
			]`,
			wantOutput: `[
				{"role": "assistant", "parts": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Paris"}}], "finish_reason": "tool_call"}
			]`,
		},
		{
			name: "Chat_ToolTurn",
			input: `[
				{"role": "user", "content": "Weather in Paris?"},
				{"role": "assistant", "content": null, "tool_calls": [{"id": "call_1", "type": "function", "name": "get_weather", "args": "{\"city\": \"Paris\"}"}]},
				{"role": "tool", "tool_call_id": "call_1", "content": "{\"temp_c\": 21, \"sky\": \"clear\"}"}
			]`,
			output:    `[{"role": "assistant", "content": "It is 21°C and clear in Paris.", "finish_reason": "stop"}]`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
				{"role": "user", "parts": [{"type": "text", "content": "Weather in Paris?"}]},
				{"role": "assistant", "parts": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Paris"}}]},
				{"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_1", "response": {"temp_c": 21, "sky": "clear"}}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "It is 21°C and clear in Paris."}], "finish_reason": "stop"}]`,
		},
		{
			name:       "Chat_UnknownBlockKeptAsSent",
			input:      `[{"role": "user", "content": [{"type": "input_audio", "input_audio": {"data": "aGk=", "format": "wav"}}]}]`,
			formatter:  FormatterOpenAIChat,
			wantInput:  `[{"role": "user", "parts": [{"type": "input_audio", "input_audio": {"data": "aGk=", "format": "wav"}}]}]`,
			wantOutput: `[]`,
		},
		{
			name:       "Chat_TwiceEncoded",
			input:      `"[{\"role\":\"human\",\"content\":\"hi\"}]"`,
			formatter:  FormatterOpenAIChat,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[]`,
		},
	})
}
