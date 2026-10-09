package genaiformatter

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
	})
}
