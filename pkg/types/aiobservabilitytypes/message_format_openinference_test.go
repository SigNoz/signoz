package aiobservabilitytypes

import "testing"

// Captured cases are the llm.input_messages.N.* and llm.output_messages.N.* keys as the collector
// stored them for the SigNoz/scripts static-telemetry-generator captures.
func TestFormat_OpenInference(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// openinference capture, ChatCompletion span: the flattened keys win over the raw request the
			// mapper moved onto gen_ai.input.messages
			name: "FlattenedMessages_RawRequestIgnored",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":     "system",
				"llm.input_messages.0.message.content":  "You are concise.",
				"llm.input_messages.1.message.role":     "user",
				"llm.input_messages.1.message.content":  "Say hello in five words.",
				"llm.output_messages.0.message.role":    "assistant",
				"llm.output_messages.0.message.content": "Hello! How are you today?",
				"llm.finish_reason":                     "stop",
				GenAIInputMessages:                      `{"messages": [{"role": "system", "content": "You are concise."}, {"role": "user", "content": "Say hello in five words."}], "model": "gpt-4o-mini", "max_tokens": 50, "temperature": 0.2}`,
			},
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are concise."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Say hello in five words."}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello! How are you today?"}], "finish_reason": "stop"}]`,
		},
		{
			// openinference capture, ChatCompletion span: message.tool_calls and llm.finish_reason
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/tool_calling.md#L37
			name: "ToolCalls_ToolCallParts_FinishReasonFromLLMKey",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                       "user",
				"llm.input_messages.0.message.content":                                    "What is the weather in Bengaluru in celsius?",
				"llm.output_messages.0.message.role":                                      "assistant",
				"llm.output_messages.0.message.tool_calls.0.tool_call.id":                 "call_MdYKTRrkshuBG9W5oBXYZaRc",
				"llm.output_messages.0.message.tool_calls.0.tool_call.function.name":      "get_current_weather",
				"llm.output_messages.0.message.tool_calls.0.tool_call.function.arguments": `{"city":"Bengaluru","unit":"c"}`,
				"llm.finish_reason": "tool_calls",
			},
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "What is the weather in Bengaluru in celsius?"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_current_weather", "id": "call_MdYKTRrkshuBG9W5oBXYZaRc", "arguments": {"city": "Bengaluru", "unit": "c"}}], "finish_reason": "tool_call"}]`,
		},
		{
			// openinference capture, the follow-up ChatCompletion span: tool role messages carry the result
			// in message.content with their tool_call_id
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/llm_spans.md#L50
			name: "ToolRoleMessages_ToolCallResponseParts",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                      "user",
				"llm.input_messages.0.message.content":                                   "What's the weather in Paris and in London? Use the tool for each.",
				"llm.input_messages.1.message.role":                                      "assistant",
				"llm.input_messages.1.message.tool_calls.0.tool_call.id":                 "call_SW4hst7nzysgvWSAz4OdyK9D",
				"llm.input_messages.1.message.tool_calls.0.tool_call.function.name":      "get_current_weather",
				"llm.input_messages.1.message.tool_calls.0.tool_call.function.arguments": `{"city": "Paris"}`,
				"llm.input_messages.1.message.tool_calls.1.tool_call.id":                 "call_si8wiETYGpooMB7gMXSgMQpk",
				"llm.input_messages.1.message.tool_calls.1.tool_call.function.name":      "get_current_weather",
				"llm.input_messages.1.message.tool_calls.1.tool_call.function.arguments": `{"city": "London"}`,
				"llm.input_messages.2.message.role":                                      "tool",
				"llm.input_messages.2.message.tool_call_id":                              "call_SW4hst7nzysgvWSAz4OdyK9D",
				"llm.input_messages.2.message.content":                                   `{"city": "Paris", "temp_c": 18, "summary": "Clear"}`,
				"llm.input_messages.3.message.role":                                      "tool",
				"llm.input_messages.3.message.tool_call_id":                              "call_si8wiETYGpooMB7gMXSgMQpk",
				"llm.input_messages.3.message.content":                                   `{"city": "London", "temp_c": 18, "summary": "Clear"}`,
				"llm.output_messages.0.message.role":                                     "assistant",
				"llm.output_messages.0.message.content":                                  "The current weather is as follows:\n\n- **Paris**: 18°C, Clear\n- **London**: 18°C, Clear",
				"llm.finish_reason":                                                      "stop",
			},
			wantInput: `[
			  {"role": "user", "parts": [{"type": "text", "content": "What's the weather in Paris and in London? Use the tool for each."}]},
			  {"role": "assistant", "parts": [
			    {"type": "tool_call", "name": "get_current_weather", "id": "call_SW4hst7nzysgvWSAz4OdyK9D", "arguments": {"city": "Paris"}},
			    {"type": "tool_call", "name": "get_current_weather", "id": "call_si8wiETYGpooMB7gMXSgMQpk", "arguments": {"city": "London"}}
			  ]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_SW4hst7nzysgvWSAz4OdyK9D", "response": {"city": "Paris", "temp_c": 18, "summary": "Clear"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_si8wiETYGpooMB7gMXSgMQpk", "response": {"city": "London", "temp_c": 18, "summary": "Clear"}}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "The current weather is as follows:\n\n- **Paris**: 18°C, Clear\n- **London**: 18°C, Clear"}], "finish_reason": "stop"}]`,
		},
		{
			// openinference capture, vision call; base64 trimmed. An image as a data URL:
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/multimodal_attributes.md#L47
			name: "ContentsTextAndImage_TextAndBlobParts",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                       "user",
				"llm.input_messages.0.message.contents.0.message_content.type":            "text",
				"llm.input_messages.0.message.contents.0.message_content.text":            "What animal is in this image? One sentence.",
				"llm.input_messages.0.message.contents.1.message_content.type":            "image",
				"llm.input_messages.0.message.contents.1.message_content.image.image.url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD",
				"llm.output_messages.0.message.role":                                      "assistant",
				"llm.output_messages.0.message.content":                                   "The animal in the image is a duck.",
				"llm.finish_reason":                                                       "stop",
			},
			wantInput: `[{"role": "user", "parts": [
			  {"type": "text", "content": "What animal is in this image? One sentence."},
			  {"type": "blob", "modality": "image", "mime_type": "image/jpeg", "content": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD"}
			]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "The animal in the image is a duck."}], "finish_reason": "stop"}]`,
		},
		{
			// openinference-openai-agents capture, Response span: one output message per item, an empty one
			// for a reasoning item without a summary
			name: "ResponsesOutputItems_AssistantMessagesFolded_EmptyDropped",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                  "system",
				"llm.input_messages.0.message.content":                               "You solve problems step by step and give a final answer.",
				"llm.input_messages.1.message.role":                                  "user",
				"llm.input_messages.1.message.content":                               "A bat and a ball cost $1.10. How much is the ball?",
				"llm.output_messages.0.message.role":                                 "assistant",
				"llm.output_messages.1.message.role":                                 "assistant",
				"llm.output_messages.1.message.contents.0.message_content.type":      "text",
				"llm.output_messages.1.message.contents.0.message_content.text":      "Final Answer: The ball costs $0.05.",
				"llm.output_messages.2.message.role":                                 "assistant",
				"llm.output_messages.2.message.tool_calls.0.tool_call.id":            "call_1",
				"llm.output_messages.2.message.tool_calls.0.tool_call.function.name": "done",
			},
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You solve problems step by step and give a final answer."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "A bat and a ball cost $1.10. How much is the ball?"}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "text", "content": "Final Answer: The ball costs $0.05."},
			  {"type": "tool_call", "name": "done", "id": "call_1"}
			]}]`,
		},
		{
			// openinference capture, the ChatCompletion span of a failed call
			name: "InputOnly_NoOutput",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":    "user",
				"llm.input_messages.0.message.content": "this should fail",
			},
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "this should fail"}]}]`,
			wantOutput: `[]`,
		},
		{
			// the strands processor keeps the SDK's gen_ai.system_instructions on the span and inserts the same
			// prompt as message 0
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-strands-agents/src/openinference/instrumentation/strands_agents/processor.py#L152
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-strands-agents/src/openinference/instrumentation/strands_agents/processor.py#L293
			name: "StrandsSystemInstructionsRepeated_OneSystemMessage",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":     "system",
				"llm.input_messages.0.message.content":  "You are concise.",
				"llm.input_messages.1.message.role":     "user",
				"llm.input_messages.1.message.content":  "hi",
				"llm.output_messages.0.message.role":    "assistant",
				"llm.output_messages.0.message.content": "Hello.",
				GenAISystemInstructions:                 `[{"type": "text", "content": "You are concise."}]`,
			},
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are concise."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "hi"}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello."}]}]`,
		},
		{
			// pipecat writes the request as llm.input_messages and the streamed reply as output.value alone,
			// which the mapper moves onto gen_ai.output.messages
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-pipecat/src/openinference/instrumentation/pipecat/_attributes.py#L430
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-pipecat/src/openinference/instrumentation/pipecat/_observer.py#L628
			name: "OutputKeysAbsent_RawOutputFormatted",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":    "user",
				"llm.input_messages.0.message.content": "hi",
				GenAIOutputMessages:                    "Hello there.",
			},
			warnings:   []string{"bare assistant text, role assumed"},
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello there."}]}]`,
		},
		{
			// LiteLLM's OpenInference mode leaves the output bucket empty on a tool-calling turn; the calls are
			// the Langfuse output the mapper moved onto gen_ai.output.messages
			name: "EmptyOutputBucket_RawOutputFormatted",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":     "user",
				"llm.input_messages.0.message.content":  "Yes, go ahead.",
				"llm.output_messages.0.message.role":    "assistant",
				"llm.output_messages.0.message.content": "",
				GenAIOutputMessages:                     `[{"id": "chatcmpl-2", "name": "set_stage", "call_id": "call_8", "type": "function_call", "arguments": {"fields": {"stage": "email"}}}]`,
			},
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "Yes, go ahead."}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "set_stage", "id": "call_8", "arguments": {"fields": {"stage": "email"}}}]}]`,
		},
		{
			// message.role left unset by some instrumentors: tool_call_id, tool_calls or neither decide it,
			// as the collector-contrib normalizer does
			// https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/fc79b95297776dec6c47490cd6f6026b942bf6fb/processor/genainormalizerprocessor/internal/openinference/messages.go#L473
			name: "MissingRole_InferredFromToolFields",
			attributes: map[string]any{
				"llm.input_messages.0.message.content":                                   "Weather in Oslo?",
				"llm.input_messages.1.message.tool_calls.0.tool_call.id":                 "call_9",
				"llm.input_messages.1.message.tool_calls.0.tool_call.function.name":      "get_weather",
				"llm.input_messages.1.message.tool_calls.0.tool_call.function.arguments": `{"city":"Oslo"}`,
				"llm.input_messages.2.message.tool_call_id":                              "call_9",
				"llm.input_messages.2.message.content":                                   "4C, cloudy",
			},
			wantInput: `[
			  {"role": "user", "parts": [{"type": "text", "content": "Weather in Oslo?"}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_9", "arguments": {"city": "Oslo"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_9", "response": "4C, cloudy"}]}
			]`,
			wantOutput: `[]`,
		},
		{
			// message_content.type left unset on text items by some instrumentors, as the collector-contrib
			// normalizer reads them
			// https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/fc79b95297776dec6c47490cd6f6026b942bf6fb/processor/genainormalizerprocessor/internal/openinference/messages.go#L285
			name: "UntypedContentWithText_TextPart",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                            "user",
				"llm.input_messages.0.message.contents.0.message_content.text": "Summarise this.",
				"llm.input_messages.0.message.contents.1.message_content.text": "Second block.",
			},
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "Summarise this."}, {"type": "text", "content": "Second block."}]}]`,
			wantOutput: `[]`,
		},
		{
			// an image given by URL
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/multimodal_attributes.md#L42
			name: "ImageURL_UriPart",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                       "user",
				"llm.input_messages.0.message.contents.0.message_content.type":            "image",
				"llm.input_messages.0.message.contents.0.message_content.image.image.url": "https://example.com/duck.jpg",
			},
			wantInput:  `[{"role": "user", "parts": [{"type": "uri", "modality": "image", "uri": "https://example.com/duck.jpg"}]}]`,
			wantOutput: `[]`,
		},
		{
			// audio by URL with its transcript, or as the data URI built from a Chat Completions input_audio
			// block; the transcript has no part to go to
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/multimodal_attributes.md#L55
			name: "Audio_UriAndBlobParts_TranscriptDropped",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                              "user",
				"llm.input_messages.0.message.contents.0.message_content.type":                   "audio",
				"llm.input_messages.0.message.contents.0.message_content.audio.audio.url":        "https://example.com/hello.mp3",
				"llm.input_messages.0.message.contents.0.message_content.audio.audio.transcript": "Hello, how are you?",
				"llm.input_messages.0.message.contents.1.message_content.type":                   "audio",
				"llm.input_messages.0.message.contents.1.message_content.audio.audio.url":        "data:audio/wav;base64,UklGRg==",
			},
			wantInput: `[{"role": "user", "parts": [
			  {"type": "uri", "modality": "audio", "uri": "https://example.com/hello.mp3"},
			  {"type": "blob", "modality": "audio", "mime_type": "audio/wav", "content": "UklGRg=="}
			]}]`,
			wantOutput: `[]`,
		},
		{
			// reasoning items; id, signature, data and encrypted_content have no field on the reasoning part
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/llm_spans.md#L181
			name: "Reasoning_ReasoningParts_ProviderKeysDropped",
			attributes: map[string]any{
				"llm.output_messages.0.message.role":                                         "assistant",
				"llm.output_messages.0.message.contents.0.message_content.type":              "reasoning",
				"llm.output_messages.0.message.contents.0.message_content.text":              "The ball must cost less than a dollar.",
				"llm.output_messages.0.message.contents.0.message_content.signature":         "EuYBCkQYAiJA",
				"llm.output_messages.0.message.contents.1.message_content.type":              "reasoning",
				"llm.output_messages.0.message.contents.1.message_content.data":              "EmwKAhgBEgy3",
				"llm.output_messages.0.message.contents.2.message_content.type":              "reasoning",
				"llm.output_messages.0.message.contents.2.message_content.id":                "rs_abc123",
				"llm.output_messages.0.message.contents.2.message_content.encrypted_content": "gAAAAA==",
				"llm.output_messages.0.message.contents.3.message_content.type":              "text",
				"llm.output_messages.0.message.contents.3.message_content.text":              "The ball costs 5 cents.",
			},
			wantInput: `[]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "reasoning", "content": "The ball must cost less than a dollar."},
			  {"type": "reasoning", "content": ""},
			  {"type": "reasoning", "content": ""},
			  {"type": "text", "content": "The ball costs 5 cents."}
			]}]`,
		},
		{
			// a tool call repeated as an ordered tool_use content item; message.tool_calls stays the one
			// source. llm.finish_reason is Anthropic's stop_reason as the instrumentation passes it through
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/tool_calling.md#L63
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-anthropic/src/openinference/instrumentation/anthropic/_wrappers.py#L938
			name: "ToolUseBesideToolCalls_OneToolCallPart",
			attributes: map[string]any{
				"llm.output_messages.0.message.role":                                      "assistant",
				"llm.output_messages.0.message.contents.0.message_content.type":           "text",
				"llm.output_messages.0.message.contents.0.message_content.text":           "Let me check.",
				"llm.output_messages.0.message.contents.1.message_content.type":           "tool_use",
				"llm.output_messages.0.message.contents.1.tool_call.id":                   "toolu_01",
				"llm.output_messages.0.message.contents.1.tool_call.function.name":        "get_weather",
				"llm.output_messages.0.message.contents.1.tool_call.function.arguments":   `{"city": "Paris"}`,
				"llm.output_messages.0.message.tool_calls.0.tool_call.id":                 "toolu_01",
				"llm.output_messages.0.message.tool_calls.0.tool_call.function.name":      "get_weather",
				"llm.output_messages.0.message.tool_calls.0.tool_call.function.arguments": `{"city": "Paris"}`,
				"llm.finish_reason": "tool_use",
			},
			wantInput: `[]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "text", "content": "Let me check."},
			  {"type": "tool_call", "name": "get_weather", "id": "toolu_01", "arguments": {"city": "Paris"}}
			], "finish_reason": "tool_call"}]`,
		},
		{
			// a content type the spec does not name is kept as sent
			name: "UnknownContentType_GenericPart",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                            "user",
				"llm.input_messages.0.message.contents.0.message_content.type":                 "document",
				"llm.input_messages.0.message.contents.0.message_content.document.document.id": "file_1",
			},
			wantInput:  `[{"role": "user", "parts": [{"type": "document", "document": {"document": {"id": "file_1"}}}]}]`,
			wantOutput: `[]`,
		},
		{
			// the legacy function_call keys
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/semantic_conventions.md#L111
			name: "LegacyFunctionCall_ToolCallPart",
			attributes: map[string]any{
				"llm.output_messages.0.message.role":                         "assistant",
				"llm.output_messages.0.message.function_call_name":           "multiply",
				"llm.output_messages.0.message.function_call_arguments_json": `{"x": 2}`,
			},
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "multiply", "arguments": {"x": 2}}]}]`,
		},
		{
			// a tool result with message.name naming the function
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/llm_spans.md#L50
			name: "ToolResultWithName_NameKept",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":         "tool",
				"llm.input_messages.0.message.name":         "multiply",
				"llm.input_messages.0.message.tool_call_id": "call_62136355",
				"llm.input_messages.0.message.content":      "2001",
			},
			wantInput:  `[{"role": "tool", "name": "multiply", "parts": [{"type": "tool_call_response", "id": "call_62136355", "response": "2001"}]}]`,
			wantOutput: `[]`,
		},
		{
			// OpenInference replaces a base64 image over 32,000 characters with __REDACTED__:
			// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/openinference-instrumentation/src/openinference/instrumentation/config.py#L431
			name: "RedactedImage_GenericPart_Warns",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                       "user",
				"llm.input_messages.0.message.contents.0.message_content.type":            "image",
				"llm.input_messages.0.message.contents.0.message_content.image.image.url": "__REDACTED__",
			},
			warnings:   []string{"media without a URL kept as generic"},
			wantInput:  `[{"role": "user", "parts": [{"type": "generic", "modality": "image", "content": "__REDACTED__"}]}]`,
			wantOutput: `[]`,
		},
	})
}
