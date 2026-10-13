package aiobservabilitytypes

import "testing"

// Captured cases are gen_ai.input.messages and gen_ai.output.messages as the collector stored
// them for the SigNoz/scripts static-telemetry-generator captures.
func TestFormat_OpenAIChat(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// openinference capture, ChatCompletion span: the raw OpenAI request and response
			name:      "ResponseWithToolCalls_ToolCallParts_FinishReasonToolCall",
			input:     `{"messages": [{"role": "user", "content": "What's the weather in Paris and in London? Use the tool for each."}], "model": "gpt-4o-mini", "max_tokens": 120, "tool_choice": "auto", "tools": [{"type": "function", "function": {"name": "get_current_weather", "description": "Get the current weather for a city.", "parameters": {"type": "object", "properties": {"city": {"type": "string"}, "unit": {"type": "string", "enum": ["c", "f"]}}, "required": ["city"]}}}]}`,
			output:    `{"id":"chatcmpl-DksBDptnQ3aTu18YrqSdYQgiPOuRV","choices":[{"finish_reason":"tool_calls","index":0,"logprobs":null,"message":{"content":null,"refusal":null,"role":"assistant","annotations":[],"tool_calls":[{"id":"call_SW4hst7nzysgvWSAz4OdyK9D","function":{"arguments":"{\"city\": \"Paris\"}","name":"get_current_weather"},"type":"function"},{"id":"call_si8wiETYGpooMB7gMXSgMQpk","function":{"arguments":"{\"city\": \"London\"}","name":"get_current_weather"},"type":"function"}]}}],"created":1780063727,"model":"gpt-4o-mini-2024-07-18","object":"chat.completion","service_tier":"default","system_fingerprint":"fp_6e71a9f378","usage":{"completion_tokens":46,"prompt_tokens":71,"total_tokens":117,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0}}}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "What's the weather in Paris and in London? Use the tool for each."
			      }
			    ]
			  }
			]`,
			wantOutput: `[
			  {
			    "role": "assistant",
			    "parts": [
			      {
			        "type": "tool_call",
			        "name": "get_current_weather",
			        "id": "call_SW4hst7nzysgvWSAz4OdyK9D",
			        "arguments": {
			          "city": "Paris"
			        }
			      },
			      {
			        "type": "tool_call",
			        "name": "get_current_weather",
			        "id": "call_si8wiETYGpooMB7gMXSgMQpk",
			        "arguments": {
			          "city": "London"
			        }
			      }
			    ],
			    "finish_reason": "tool_call"
			  }
			]`,
		},
		{
			// openinference capture, the follow-up ChatCompletion span
			name:      "ToolRoleMessages_BecomeToolCallResponseParts",
			input:     `{"messages": [{"role": "user", "content": "What's the weather in Paris and in London? Use the tool for each."}, {"content": null, "refusal": null, "role": "assistant", "annotations": [], "audio": null, "function_call": null, "tool_calls": [{"id": "call_SW4hst7nzysgvWSAz4OdyK9D", "function": {"arguments": "{\"city\": \"Paris\"}", "name": "get_current_weather"}, "type": "function"}, {"id": "call_si8wiETYGpooMB7gMXSgMQpk", "function": {"arguments": "{\"city\": \"London\"}", "name": "get_current_weather"}, "type": "function"}]}, {"role": "tool", "tool_call_id": "call_SW4hst7nzysgvWSAz4OdyK9D", "content": "{\"city\": \"Paris\", \"temp_c\": 18, \"summary\": \"Clear\"}"}, {"role": "tool", "tool_call_id": "call_si8wiETYGpooMB7gMXSgMQpk", "content": "{\"city\": \"London\", \"temp_c\": 18, \"summary\": \"Clear\"}"}], "model": "gpt-4o-mini", "max_tokens": 80}`,
			output:    `{"id":"chatcmpl-DksBF2QuaoMMMFg9UAXX9Rc28XVJT","choices":[{"finish_reason":"stop","index":0,"logprobs":null,"message":{"content":"The current weather is as follows:\n\n- **Paris**: 18°C, Clear\n- **London**: 18°C, Clear\n\nBoth cities are enjoying clear skies with the same temperature.","refusal":null,"role":"assistant","annotations":[]}}],"created":1780063729,"model":"gpt-4o-mini-2024-07-18","object":"chat.completion","service_tier":"default","system_fingerprint":"fp_e2d886d409","usage":{"completion_tokens":40,"prompt_tokens":118,"total_tokens":158,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0}}}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "What's the weather in Paris and in London? Use the tool for each."
			      }
			    ]
			  },
			  {
			    "role": "assistant",
			    "parts": [
			      {
			        "type": "tool_call",
			        "name": "get_current_weather",
			        "id": "call_SW4hst7nzysgvWSAz4OdyK9D",
			        "arguments": {
			          "city": "Paris"
			        }
			      },
			      {
			        "type": "tool_call",
			        "name": "get_current_weather",
			        "id": "call_si8wiETYGpooMB7gMXSgMQpk",
			        "arguments": {
			          "city": "London"
			        }
			      }
			    ]
			  },
			  {
			    "role": "tool",
			    "parts": [
			      {
			        "type": "tool_call_response",
			        "response": {
			          "city": "Paris",
			          "summary": "Clear",
			          "temp_c": 18
			        },
			        "id": "call_SW4hst7nzysgvWSAz4OdyK9D"
			      }
			    ]
			  },
			  {
			    "role": "tool",
			    "parts": [
			      {
			        "type": "tool_call_response",
			        "response": {
			          "city": "London",
			          "summary": "Clear",
			          "temp_c": 18
			        },
			        "id": "call_si8wiETYGpooMB7gMXSgMQpk"
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
			        "content": "The current weather is as follows:\n\n- **Paris**: 18°C, Clear\n- **London**: 18°C, Clear\n\nBoth cities are enjoying clear skies with the same temperature."
			      }
			    ],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			// bifrost-gateway capture, HTTP span
			name:      "GatewayFlattenedToolCalls_ToolCallParts_BareInputWarns",
			input:     `What's the weather in Paris and in London? Use the tool for each.`,
			output:    `[{"role":"assistant","content":"","tool_calls":[{"id":"call_xP33RT5exgBrNsvsWQZwiY9D","type":"function","name":"get_current_weather","args":"{\"city\": \"Paris\"}"},{"id":"call_lC6GgT8JW2ygJqWEM2wcohIz","type":"function","name":"get_current_weather","args":"{\"city\": \"London\"}"}]}]`,
			formatter: FormatterText,
			warnings:  []string{"bare user text, role assumed", "output formatted as openai.chat, input as text"},
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "What's the weather in Paris and in London? Use the tool for each."
			      }
			    ]
			  }
			]`,
			wantOutput: `[
			  {
			    "role": "assistant",
			    "parts": [
			      {
			        "type": "tool_call",
			        "name": "get_current_weather",
			        "id": "call_xP33RT5exgBrNsvsWQZwiY9D",
			        "arguments": {
			          "city": "Paris"
			        }
			      },
			      {
			        "type": "tool_call",
			        "name": "get_current_weather",
			        "id": "call_lC6GgT8JW2ygJqWEM2wcohIz",
			        "arguments": {
			          "city": "London"
			        }
			      }
			    ]
			  }
			]`,
		},
		{
			// ChatCompletionRequestMessageContentPartFile {file: {file_id}} (openai/openai-openapi@ee9458d,
			// openapi.yaml), as OpenInference records the request in input.value
			name:      "FileByID_FilePart",
			input:     `{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": [{"type": "text", "text": "Summarise this document in one sentence."}, {"type": "file", "file": {"file_id": "file-6F2ksmvXxt4VdoqmHRw6kL"}}]}], "max_tokens": 60}`,
			output:    `{"id":"chatcmpl-DktFileCapture0001","object":"chat.completion","model":"gpt-4o-mini-2024-07-18","choices":[{"index":0,"finish_reason":"stop","logprobs":null,"message":{"role":"assistant","content":"The document is a short PDF about dragons.","refusal":null,"annotations":[]}}]}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {"type": "text", "content": "Summarise this document in one sentence."},
			      {"type": "file", "modality": "document", "file_id": "file-6F2ksmvXxt4VdoqmHRw6kL", "mime_type": "application/pdf"}
			    ]
			  }
			]`,
			wantOutput: `[
			  {
			    "role": "assistant",
			    "parts": [{"type": "text", "content": "The document is a short PDF about dragons."}],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			// ChatCompletionRequestMessageContentPartFile {file: {filename, file_data}}, file_data a data URL
			name:      "FileInline_BlobPart",
			input:     `{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": [{"type": "text", "text": "Summarise this document in one sentence."}, {"type": "file", "file": {"filename": "draconomicon.pdf", "file_data": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbXS9Db3VudCAwPj5lbmRvYmoKdHJhaWxlcjw8L1Jvb3QgMSAwIFI+PgolJUVPRgo="}}]}], "max_tokens": 60}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {"type": "text", "content": "Summarise this document in one sentence."},
			      {"type": "blob", "modality": "document", "mime_type": "application/pdf", "content": "JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbXS9Db3VudCAwPj5lbmRvYmoKdHJhaWxlcjw8L1Jvb3QgMSAwIFI+PgolJUVPRgo="}
			    ]
			  }
			]`,
			wantOutput: `[]`,
		},
		{
			// ChatCompletionRequestMessageContentPartAudio {input_audio: {data, format}}; format is wav or mp3
			name:      "InputAudio_BlobPartWithMimeFromFormat",
			input:     `{"model": "gpt-4o-audio-preview", "messages": [{"role": "user", "content": [{"type": "text", "text": "What is in this recording?"}, {"type": "input_audio", "input_audio": {"data": "UklGRg==", "format": "wav"}}, {"type": "input_audio", "input_audio": {"data": "SUQz", "format": "flac"}}]}]}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {"type": "text", "content": "What is in this recording?"},
			      {"type": "blob", "modality": "audio", "mime_type": "audio/wav", "content": "UklGRg=="},
			      {"type": "blob", "modality": "audio", "content": "SUQz"}
			    ]
			  }
			]`,
			wantOutput: `[]`,
		},
		{
			// ChatCompletionResponseMessage.audio {id, expires_at, data, transcript}; the transcript is the
			// answer text, the bytes come without a format, and a later request refers to it by id only
			name:      "ResponseAudio_TranscriptTextAndBlob_RequestReferenceDropped",
			input:     `{"model": "gpt-4o-audio-preview", "messages": [{"role": "user", "content": "Say hi"}, {"role": "assistant", "audio": {"id": "audio_abc123"}}, {"role": "user", "content": "Again"}]}`,
			output:    `{"choices":[{"finish_reason":"stop","index":0,"message":{"role":"assistant","content":null,"refusal":null,"audio":{"id":"audio_abc123","expires_at":1729018800,"data":"UklGRg==","transcript":"Hi there!"}}}]}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
			  {"role": "user", "parts": [{"type": "text", "content": "Say hi"}]},
			  {"role": "assistant", "parts": []},
			  {"role": "user", "parts": [{"type": "text", "content": "Again"}]}
			]`,
			wantOutput: `[
			  {
			    "role": "assistant",
			    "parts": [
			      {"type": "text", "content": "Hi there!"},
			      {"type": "blob", "modality": "audio", "content": "UklGRg=="}
			    ],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			// a system prompt outside the history, as the Anthropic Messages API and LangChain take it
			name:      "SystemOutsideHistory_LeadingSystemMessage",
			input:     `{"model": "claude-3-5-sonnet", "system": "You are terse.", "messages": [{"role": "user", "content": "hi"}]}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are terse."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "hi"}]}
			]`,
			wantOutput: `[]`,
		},
		{
			name:      "ResponseWithScalarChoice_KeptAsGeneric",
			output:    `{"choices":["oops",{"finish_reason":"stop","index":1,"message":{"role":"assistant","content":"hi"}}]}`,
			formatter: FormatterOpenAIChat,
			wantInput: `[]`,
			wantOutput: `[
			  {"role": "", "parts": [{"type": "generic", "content": "oops"}]},
			  {"role": "assistant", "parts": [{"type": "text", "content": "hi"}], "finish_reason": "stop"}
			]`,
		},
	})
}
