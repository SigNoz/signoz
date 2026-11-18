package aiobservabilitytypes

import "testing"

// Captured cases are gen_ai.input.messages and gen_ai.output.messages as the collector stored
// them for the SigNoz/scripts static-telemetry-generator captures.
func TestFormat_Semconv(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// litellm capture, litellm_request span
			name:   "SemconvMessages_DecodedUnchanged",
			input:  `[{"role": "system", "parts": [{"type": "text", "content": "You are a concise assistant."}]}, {"role": "user", "parts": [{"type": "text", "content": "Give me a one-line definition of observability."}]}]`,
			output: `[{"role": "assistant", "parts": [{"type": "text", "content": "Observability is the ability to understand the internal state of a system based on external outputs, enabling effective monitoring and troubleshooting."}], "finish_reason": "stop"}]`,
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
			name:   "SemconvTextSpelledAsTextKey_ContentFilled_ImageBlockBecomesBlob",
			input:  `[{"role": "user", "parts": [{"type": "text", "text": "What animal is in this image? One sentence."}, {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD"}}]}]`,
			output: `[{"role": "assistant", "parts": [{"type": "text", "content": "The animal in the image is a cartoon duck."}], "finish_reason": "stop"}]`,
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
			name:   "SemconvToolCallTurn_DecodedUnchanged",
			input:  `[{"role": "user", "parts": [{"type": "text", "content": "Search for SigNoz AI observability docs, then tell me the weather in Bengaluru."}]}, {"role": "assistant", "parts": [{"type": "tool_call", "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd", "name": "search_web", "arguments": {"query": "SigNoz AI observability documentation"}}, {"type": "tool_call", "id": "call_nkVdZ8xX8d17HtmVddbUgJUc", "name": "get_weather", "arguments": {"city": "Bengaluru"}}]}, {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_jL9UhSdUC9wWn2qfWwOjpzFd", "response": "{\"query\": \"SigNoz AI observability documentation\", \"results\": [{\"title\": \"SigNoz docs: AI observability\", \"snippet\": \"...\"}, {\"title\": \"OpenTelemetry GenAI conventions\", \"snippet\": \"...\"}]}"}]}, {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_nkVdZ8xX8d17HtmVddbUgJUc", "response": "{\"city\": \"Bengaluru\", \"temp_c\": 18, \"summary\": \"Clear\"}"}]}]`,
			output: `[{"role": "assistant", "parts": [{"type": "text", "content": "I found some results for the SigNoz AI observability documentation. Here's one of the titles you might be interested in:\n\n- **SigNoz docs: AI observability**\n\nUnfortunately, a snippet was not provided, but you can look it up directly for more details.\n\nAs for the weather in Bengaluru, it's currently 18\u00b0C and clear."}], "finish_reason": "stop"}]`,
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
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[]`,
		},
	})
}

func TestFormat_Semconv_Repairs(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// pydantic-ai keeps string tool call arguments as sent, writes the tool result under result, and the
			// instructions as a gen_ai.system_instructions text part:
			// https://github.com/pydantic/pydantic-ai/blob/9ac853bb84ffed7ba0edccb026c5b4f3228c1de7/pydantic_ai_slim/pydantic_ai/messages.py#L3130
			// https://github.com/pydantic/pydantic-ai/blob/9ac853bb84ffed7ba0edccb026c5b4f3228c1de7/pydantic_ai_slim/pydantic_ai/messages.py#L1724
			// https://github.com/pydantic/pydantic-ai/blob/9ac853bb84ffed7ba0edccb026c5b4f3228c1de7/pydantic_ai_slim/pydantic_ai/models/instrumented.py#L292
			name:       "PydanticAI_ArgumentsDecoded_ResultBecomesResponse_InstructionsLead",
			input:      `[{"role":"user","parts":[{"type":"text","content":"Weather in Paris?"}]},{"role":"assistant","parts":[{"type":"tool_call","id":"call_stub1","name":"get_weather","arguments":"{\"city\": \"Paris\"}"}],"finish_reason":"tool_call"},{"role":"user","parts":[{"type":"tool_call_response","id":"call_stub1","name":"get_weather","result":{"city":"Paris","temp_c":18}}]}]`,
			output:     `[{"role":"assistant","parts":[{"type":"text","content":"Paris is clear at 18C."}],"finish_reason":"stop"}]`,
			attributes: map[string]any{GenAISystemInstructions: `[{"type":"text","content":"Use the tool."}]`},
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "Use the tool."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Weather in Paris?"}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_stub1", "arguments": {"city": "Paris"}}]},
			  {"role": "user", "parts": [{"type": "tool_call_response", "id": "call_stub1", "response": {"city": "Paris", "temp_c": 18}}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Paris is clear at 18C."}], "finish_reason": "stop"}]`,
		},
		{
			// litellm copies the choice finish_reason into the semconv message as OpenAI spells it:
			// https://github.com/BerriAI/litellm/blob/9d72bae336ec0d14c41651adcb0d2e1149721f46/litellm/integrations/opentelemetry.py#L2822
			name:       "LiteLLMFinishReasonSpelling_Normalised",
			output:     `[{"role": "assistant", "parts": [], "finish_reason": "tool_calls"}]`,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [], "finish_reason": "tool_call"}]`,
		},
		{
			// litellm capture, litellm_request span: litellm keeps the OpenAI tool_calls and tool_call_id beside
			// parts on each message:
			// https://github.com/BerriAI/litellm/blob/9d72bae336ec0d14c41651adcb0d2e1149721f46/litellm/integrations/opentelemetry.py#L2803
			name:  "LiteLLMToolFieldsBesideParts_ToolCallAndResponseParts",
			input: `[{"role": "user", "parts": [{"type": "text", "content": "What's the weather in Bengaluru? Use the tool."}]}, {"role": "assistant", "parts": [], "tool_calls": [{"function": {"arguments": "{\"city\":\"Bengaluru\"}", "name": "get_current_weather"}, "id": "call_GuU9siyYfjnx3DfHKzFbRrvD", "type": "function"}]}, {"role": "tool", "parts": [{"type": "text", "content": "{\"city\": \"Bengaluru\", \"temp_c\": 28, \"summary\": \"Partly cloudy\"}"}], "tool_call_id": "call_GuU9siyYfjnx3DfHKzFbRrvD"}]`,
			wantInput: `[
			  {"role": "user", "parts": [{"type": "text", "content": "What's the weather in Bengaluru? Use the tool."}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_current_weather", "id": "call_GuU9siyYfjnx3DfHKzFbRrvD", "arguments": {"city": "Bengaluru"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_GuU9siyYfjnx3DfHKzFbRrvD", "response": {"city": "Bengaluru", "temp_c": 28, "summary": "Partly cloudy"}}]}
			]`,
			wantOutput: `[]`,
		},
	})
}
