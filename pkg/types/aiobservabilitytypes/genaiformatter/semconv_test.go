package genaiformatter

import "testing"

// Captured cases are gen_ai.input.messages and gen_ai.output.messages as the collector stored
// them for the SigNoz/scripts static-telemetry-generator captures.
func TestFormat_Semconv(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// litellm capture, litellm_request span
			name:      "SemconvMessages_DecodedUnchanged",
			input:     `[{"role": "system", "parts": [{"type": "text", "content": "You are a concise assistant."}]}, {"role": "user", "parts": [{"type": "text", "content": "Give me a one-line definition of observability."}]}]`,
			output:    `[{"role": "assistant", "parts": [{"type": "text", "content": "Observability is the ability to understand the internal state of a system based on external outputs, enabling effective monitoring and troubleshooting."}], "finish_reason": "stop"}]`,
			formatter: FormatterSemconv,
			wantInput: `[
			  {
			    "role": "system",
			    "parts": [
			      {
			        "type": "text",
			        "content": "You are a concise assistant."
			      }
			    ]
			  },
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "Give me a one-line definition of observability."
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
			        "content": "Observability is the ability to understand the internal state of a system based on external outputs, enabling effective monitoring and troubleshooting."
			      }
			    ],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			// litellm capture, vision call; base64 trimmed
			name:      "SemconvTextSpelledAsTextKey_ContentFilled_ImageBlockBecomesBlob",
			input:     `[{"role": "user", "parts": [{"type": "text", "text": "What animal is in this image? One sentence."}, {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD"}}]}]`,
			output:    `[{"role": "assistant", "parts": [{"type": "text", "content": "The animal in the image is a cartoon duck."}], "finish_reason": "stop"}]`,
			formatter: FormatterSemconv,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "What animal is in this image? One sentence."
			      },
			      {
			        "type": "blob",
			        "modality": "image",
			        "content": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD",
			        "mime_type": "image/jpeg"
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
			        "content": "The animal in the image is a cartoon duck."
			      }
			    ],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			// langchain capture, ChatOpenAI.chat span
			name:      "SemconvToolCallTurn_DecodedUnchanged",
			input:     `[{"role": "user", "parts": [{"type": "text", "content": "Search for SigNoz AI observability docs, then tell me the weather in Bengaluru."}]}, {"role": "assistant", "parts": [{"type": "tool_call", "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd", "name": "search_web", "arguments": {"query": "SigNoz AI observability documentation"}}, {"type": "tool_call", "id": "call_nkVdZ8xX8d17HtmVddbUgJUc", "name": "get_weather", "arguments": {"city": "Bengaluru"}}]}, {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd", "response": "{\"query\": \"SigNoz AI observability documentation\", \"results\": [{\"title\": \"SigNoz docs: AI observability\", \"snippet\": \"...\"}, {\"title\": \"OpenTelemetry GenAI conventions\", \"snippet\": \"...\"}]}"}]}, {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_nkVdZ8xX8d17HtmVddbUgJUc", "response": "{\"city\": \"Bengaluru\", \"temp_c\": 18, \"summary\": \"Clear\"}"}]}]`,
			output:    `[{"role": "assistant", "parts": [{"type": "text", "content": "I found some results for the SigNoz AI observability documentation. Here's one of the titles you might be interested in:\n\n- **SigNoz docs: AI observability**\n\nUnfortunately, a snippet was not provided, but you can look it up directly for more details.\n\nAs for the weather in Bengaluru, it's currently 18\u00b0C and clear."}], "finish_reason": "stop"}]`,
			formatter: FormatterSemconv,
			wantInput: `[
			  {
			    "role": "user",
			    "parts": [
			      {
			        "type": "text",
			        "content": "Search for SigNoz AI observability docs, then tell me the weather in Bengaluru."
			      }
			    ]
			  },
			  {
			    "role": "assistant",
			    "parts": [
			      {
			        "type": "tool_call",
			        "name": "search_web",
			        "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd",
			        "arguments": {
			          "query": "SigNoz AI observability documentation"
			        }
			      },
			      {
			        "type": "tool_call",
			        "name": "get_weather",
			        "id": "call_nkVdZ8xX8d17HtmVddbUgJUc",
			        "arguments": {
			          "city": "Bengaluru"
			        }
			      }
			    ]
			  },
			  {
			    "role": "tool",
			    "parts": [
			      {
			        "type": "tool_call_response",
			        "response": "{\"query\": \"SigNoz AI observability documentation\", \"results\": [{\"title\": \"SigNoz docs: AI observability\", \"snippet\": \"...\"}, {\"title\": \"OpenTelemetry GenAI conventions\", \"snippet\": \"...\"}]}",
			        "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd"
			      }
			    ]
			  },
			  {
			    "role": "tool",
			    "parts": [
			      {
			        "type": "tool_call_response",
			        "response": "{\"city\": \"Bengaluru\", \"temp_c\": 18, \"summary\": \"Clear\"}",
			        "id": "call_nkVdZ8xX8d17HtmVddbUgJUc"
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
			        "content": "I found some results for the SigNoz AI observability documentation. Here's one of the titles you might be interested in:\n\n- **SigNoz docs: AI observability**\n\nUnfortunately, a snippet was not provided, but you can look it up directly for more details.\n\nAs for the weather in Bengaluru, it's currently 18°C and clear."
			      }
			    ],
			    "finish_reason": "stop"
			  }
			]`,
		},
		{
			name:       "StructuredSemconvValue_DecodedWithoutJSONString",
			input:      []any{map[string]any{"role": "user", "parts": []any{map[string]any{"type": "text", "content": "hi"}}}},
			formatter:  FormatterSemconv,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[]`,
		},
	})
}
