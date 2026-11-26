package aiobservabilitytypes

import "testing"

// Captured cases are gen_ai.input.messages and gen_ai.output.messages as the collector stored
// them for the SigNoz/scripts static-telemetry-generator captures.
func TestFormat_OpenAIChat(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// openinference capture, ChatCompletion span: the raw OpenAI request and response
			name:   "ResponseWithToolCalls_ToolCallParts_FinishReasonToolCall",
			input:  `{"messages": [{"role": "user", "content": "What's the weather in Paris and in London? Use the tool for each."}], "model": "gpt-4o-mini", "max_tokens": 120, "tool_choice": "auto", "tools": [{"type": "function", "function": {"name": "get_current_weather", "description": "Get the current weather for a city.", "parameters": {"type": "object", "properties": {"city": {"type": "string"}, "unit": {"type": "string", "enum": ["c", "f"]}}, "required": ["city"]}}}]}`,
			output: `{"id":"chatcmpl-DksBDptnQ3aTu18YrqSdYQgiPOuRV","choices":[{"finish_reason":"tool_calls","index":0,"logprobs":null,"message":{"content":null,"refusal":null,"role":"assistant","annotations":[],"tool_calls":[{"id":"call_SW4hst7nzysgvWSAz4OdyK9D","function":{"arguments":"{\"city\": \"Paris\"}","name":"get_current_weather"},"type":"function"},{"id":"call_si8wiETYGpooMB7gMXSgMQpk","function":{"arguments":"{\"city\": \"London\"}","name":"get_current_weather"},"type":"function"}]}}],"created":1780063727,"model":"gpt-4o-mini-2024-07-18","object":"chat.completion","service_tier":"default","system_fingerprint":"fp_6e71a9f378","usage":{"completion_tokens":46,"prompt_tokens":71,"total_tokens":117,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0}}}`,
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
			name:   "ToolRoleMessages_BecomeToolCallResponseParts",
			input:  `{"messages": [{"role": "user", "content": "What's the weather in Paris and in London? Use the tool for each."}, {"content": null, "refusal": null, "role": "assistant", "annotations": [], "audio": null, "function_call": null, "tool_calls": [{"id": "call_SW4hst7nzysgvWSAz4OdyK9D", "function": {"arguments": "{\"city\": \"Paris\"}", "name": "get_current_weather"}, "type": "function"}, {"id": "call_si8wiETYGpooMB7gMXSgMQpk", "function": {"arguments": "{\"city\": \"London\"}", "name": "get_current_weather"}, "type": "function"}]}, {"role": "tool", "tool_call_id": "call_SW4hst7nzysgvWSAz4OdyK9D", "content": "{\"city\": \"Paris\", \"temp_c\": 18, \"summary\": \"Clear\"}"}, {"role": "tool", "tool_call_id": "call_si8wiETYGpooMB7gMXSgMQpk", "content": "{\"city\": \"London\", \"temp_c\": 18, \"summary\": \"Clear\"}"}], "model": "gpt-4o-mini", "max_tokens": 80}`,
			output: `{"id":"chatcmpl-DksBF2QuaoMMMFg9UAXX9Rc28XVJT","choices":[{"finish_reason":"stop","index":0,"logprobs":null,"message":{"content":"The current weather is as follows:\n\n- **Paris**: 18°C, Clear\n- **London**: 18°C, Clear\n\nBoth cities are enjoying clear skies with the same temperature.","refusal":null,"role":"assistant","annotations":[]}}],"created":1780063729,"model":"gpt-4o-mini-2024-07-18","object":"chat.completion","service_tier":"default","system_fingerprint":"fp_e2d886d409","usage":{"completion_tokens":40,"prompt_tokens":118,"total_tokens":158,"completion_tokens_details":{"accepted_prediction_tokens":0,"audio_tokens":0,"reasoning_tokens":0,"rejected_prediction_tokens":0},"prompt_tokens_details":{"audio_tokens":0,"cached_tokens":0}}}`,
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
			name:     "GatewayFlattenedToolCalls_ToolCallParts_BareInputWarns",
			input:    `What's the weather in Paris and in London? Use the tool for each.`,
			output:   `[{"role":"assistant","content":"","tool_calls":[{"id":"call_xP33RT5exgBrNsvsWQZwiY9D","type":"function","name":"get_current_weather","args":"{\"city\": \"Paris\"}"},{"id":"call_lC6GgT8JW2ygJqWEM2wcohIz","type":"function","name":"get_current_weather","args":"{\"city\": \"London\"}"}]}]`,
			warnings: []string{"bare user text, role assumed", "output formatted as openai.chat, input as text"},
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
			// ChatCompletionRequestMessageContentPartFile {file: {file_id}}, as OpenInference records the request in input.value:
			// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L42650
			name:   "FileByID_FilePart",
			input:  `{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": [{"type": "text", "text": "Summarise this document in one sentence."}, {"type": "file", "file": {"file_id": "file-6F2ksmvXxt4VdoqmHRw6kL"}}]}], "max_tokens": 60}`,
			output: `{"id":"chatcmpl-DktFileCapture0001","object":"chat.completion","model":"gpt-4o-mini-2024-07-18","choices":[{"index":0,"finish_reason":"stop","logprobs":null,"message":{"role":"assistant","content":"The document is a short PDF about dragons.","refusal":null,"annotations":[]}}]}`,
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
			// ChatCompletionRequestMessageContentPartFile {file: {filename, file_data}}, file_data a data URL:
			// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L42650
			name:  "FileInline_BlobPart",
			input: `{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": [{"type": "text", "text": "Summarise this document in one sentence."}, {"type": "file", "file": {"filename": "draconomicon.pdf", "file_data": "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbXS9Db3VudCAwPj5lbmRvYmoKdHJhaWxlcjw8L1Jvb3QgMSAwIFI+PgolJUVPRgo="}}]}], "max_tokens": 60}`,
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
			// Langfuse SDK generation: the history as a list, the first choice's message as the output
			name:       "SingleMessageOutput_AssistantMessage",
			input:      `[{"role": "system", "content": "You are a support agent on a phone call."}, {"role": "user", "content": "Hello?"}]`,
			output:     `{"role": "assistant", "content": "Hi, this is a courtesy call about your order. Do you have a minute?"}`,
			wantInput:  `[{"role": "system", "parts": [{"type": "text", "content": "You are a support agent on a phone call."}]}, {"role": "user", "parts": [{"type": "text", "content": "Hello?"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hi, this is a courtesy call about your order. Do you have a minute?"}]}]`,
		},
		{
			// a structured output that happens to carry a role key is not a message
			name:       "ObjectWithRoleKeyButNoContent_KeptAsGeneric",
			output:     `{"role": "admin", "permissions": ["read", "write"]}`,
			warnings:   []string{"message format not recognised, kept as generic"},
			wantInput:  `[]`,
			wantOutput: `[{"role": "", "parts": [{"type": "generic", "content": "{\"permissions\":[\"read\",\"write\"],\"role\":\"admin\"}"}]}]`,
		},
		{
			// Langfuse LangChain handler: the additional_kwargs of the AIMessage, without a role, as the output
			// of a tool-calling turn
			name:       "RolelessToolCallsOutput_AssistantToolCallPart",
			output:     `{"tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "get_weather", "arguments": "{\"city\": \"Oslo\"}"}}], "refusal": null}`,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Oslo"}}]}]`,
		},
		{
			name:      "ResponseWithScalarChoice_KeptAsGeneric",
			output:    `{"choices":["oops",{"finish_reason":"stop","index":1,"message":{"role":"assistant","content":"hi"}}]}`,
			wantInput: `[]`,
			wantOutput: `[
			  {"role": "", "parts": [{"type": "generic", "content": "oops"}]},
			  {"role": "assistant", "parts": [{"type": "text", "content": "hi"}], "finish_reason": "stop"}
			]`,
		},
		{
			// openrouter-gateway capture: OpenRouter replaces the image with a placeholder, which is no URL
			name:     "RedactedImageURL_GenericPart_Warns",
			input:    `{"messages":[{"role":"user","content":[{"type":"text","text":"What animal is in this image? One sentence."},{"type":"image_url","image_url":{"url":"[OR_REDACTED]"}}]}]}`,
			warnings: []string{"media without a URL kept as generic"},
			wantInput: `[{"role": "user", "parts": [
			  {"type": "text", "content": "What animal is in this image? One sentence."},
			  {"type": "generic", "modality": "image", "content": "[OR_REDACTED]"}
			]}]`,
			wantOutput: `[]`,
		},
	})
}
