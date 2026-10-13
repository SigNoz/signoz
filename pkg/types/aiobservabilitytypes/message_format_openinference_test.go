package aiobservabilitytypes

import "testing"

// Captured cases are the llm.input_messages.N.* and llm.output_messages.N.* keys as the collector
// stored them for the SigNoz/scripts static-telemetry-generator captures.
func TestFormat_OpenInference(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// openinference capture, ChatCompletion span; the raw request the mapper moved onto
			// gen_ai.input.messages is ignored while the flattened keys are there
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
			formatter: FormatterOpenInference,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are concise."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Say hello in five words."}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello! How are you today?"}], "finish_reason": "stop"}]`,
		},
		{
			// openinference capture, ChatCompletion span with a tool call
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
			formatter:  FormatterOpenInference,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "What is the weather in Bengaluru in celsius?"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_current_weather", "id": "call_MdYKTRrkshuBG9W5oBXYZaRc", "arguments": {"city": "Bengaluru", "unit": "c"}}], "finish_reason": "tool_call"}]`,
		},
		{
			// openinference capture, the follow-up ChatCompletion span carrying the tool results
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
			formatter: FormatterOpenInference,
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
			// openinference capture, vision call; base64 trimmed
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
			formatter: FormatterOpenInference,
			wantInput: `[{"role": "user", "parts": [
			  {"type": "text", "content": "What animal is in this image? One sentence."},
			  {"type": "blob", "modality": "image", "mime_type": "image/jpeg", "content": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD"}
			]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "The animal in the image is a duck."}], "finish_reason": "stop"}]`,
		},
		{
			// openinference-openai-agents capture, Response span: the Responses path writes one output
			// message per item, an empty one for the reasoning item without a summary
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
			formatter: FormatterOpenInference,
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
			formatter:  FormatterOpenInference,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "this should fail"}]}]`,
			wantOutput: `[]`,
		},
		{
			name: "OutputKeysAbsent_RawResponseFormatted_Warns",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":    "user",
				"llm.input_messages.0.message.content": "hi",
				GenAIOutputMessages:                    `{"choices":[{"finish_reason":"stop","index":0,"message":{"role":"assistant","content":"hello"}}]}`,
			},
			formatter:  FormatterOpenInference,
			warnings:   []string{"output formatted as openai.chat, input as openinference"},
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "hello"}], "finish_reason": "stop"}]`,
		},
	})
}

// Every message_content.type the OpenInference spec names (Arize-ai/openinference@12f2cc03,
// spec/multimodal_attributes.md, spec/tool_calling.md, spec/llm_spans.md), in the shape the named
// instrumentation writes it.
func TestFormat_OpenInference_Parts(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// openinference-instrumentation-openai _request_attributes_extractor.py: image_url {url} as sent
			name: "ImageURL_UriPart",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                       "user",
				"llm.input_messages.0.message.contents.0.message_content.type":            "image",
				"llm.input_messages.0.message.contents.0.message_content.image.image.url": "https://example.com/duck.jpg",
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[{"role": "user", "parts": [{"type": "uri", "modality": "image", "uri": "https://example.com/duck.jpg"}]}]`,
			wantOutput: `[]`,
		},
		{
			// openinference-instrumentation-anthropic _wrappers.py: {source: {media_type, data}} rebuilt as a data URL
			name: "ImageDataURL_BlobPart",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                       "user",
				"llm.input_messages.0.message.contents.0.message_content.type":            "image",
				"llm.input_messages.0.message.contents.0.message_content.image.image.url": "data:image/png;base64,iVBORw0KGgo=",
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[{"role": "user", "parts": [{"type": "blob", "modality": "image", "mime_type": "image/png", "content": "iVBORw0KGgo="}]}]`,
			wantOutput: `[]`,
		},
		{
			// openinference-instrumentation config.py REDACTED_VALUE, written for OPENINFERENCE_HIDE_INPUT_IMAGES
			name: "ImageRedacted_UriPartWithMarker",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                       "user",
				"llm.input_messages.0.message.contents.0.message_content.type":            "image",
				"llm.input_messages.0.message.contents.0.message_content.image.image.url": "__REDACTED__",
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[{"role": "user", "parts": [{"type": "uri", "modality": "image", "uri": "__REDACTED__"}]}]`,
			wantOutput: `[]`,
		},
		{
			// spec/multimodal_attributes.md audio: a URL with its transcript, or the data URI built from
			// a Chat Completions input_audio block; the transcript has no part to go to
			name: "Audio_UriAndBlobParts_TranscriptDropped",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                              "user",
				"llm.input_messages.0.message.contents.0.message_content.type":                   "audio",
				"llm.input_messages.0.message.contents.0.message_content.audio.audio.url":        "https://example.com/hello.mp3",
				"llm.input_messages.0.message.contents.0.message_content.audio.audio.transcript": "Hello, how are you?",
				"llm.input_messages.0.message.contents.1.message_content.type":                   "audio",
				"llm.input_messages.0.message.contents.1.message_content.audio.audio.url":        "data:audio/wav;base64,UklGRg==",
			},
			formatter: FormatterOpenInference,
			wantInput: `[{"role": "user", "parts": [
			  {"type": "uri", "modality": "audio", "uri": "https://example.com/hello.mp3"},
			  {"type": "blob", "modality": "audio", "mime_type": "audio/wav", "content": "UklGRg=="}
			]}]`,
			wantOutput: `[]`,
		},
		{
			// spec/multimodal_attributes.md video: object-store URIs copied verbatim
			name: "Video_UriPart",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                       "user",
				"llm.input_messages.0.message.contents.0.message_content.type":            "video",
				"llm.input_messages.0.message.contents.0.message_content.video.video.url": "gs://bucket/clip.mp4",
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[{"role": "user", "parts": [{"type": "uri", "modality": "video", "uri": "gs://bucket/clip.mp4"}]}]`,
			wantOutput: `[]`,
		},
		{
			// openinference-instrumentation-anthropic _wrappers.py thinking and redacted_thinking blocks;
			// openinference-instrumentation-openai _responses_api.py reasoning items; the signature, data,
			// id and encrypted_content keys have no field on the reasoning part
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
			formatter: FormatterOpenInference,
			wantInput: `[]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "reasoning", "content": "The ball must cost less than a dollar."},
			  {"type": "reasoning", "content": ""},
			  {"type": "reasoning", "content": ""},
			  {"type": "text", "content": "The ball costs 5 cents."}
			]}]`,
		},
		{
			// openinference-instrumentation-anthropic _wrappers.py and -groq _utils.py: a tool_use block
			// is written both as an ordered content item and under message.tool_calls
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
			formatter: FormatterOpenInference,
			wantInput: `[]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "text", "content": "Let me check."},
			  {"type": "tool_call", "name": "get_weather", "id": "toolu_01", "arguments": {"city": "Paris"}}
			], "finish_reason": "tool_call"}]`,
		},
		{
			name: "ToolUseWithoutToolCalls_ConvertedInOrder",
			attributes: map[string]any{
				"llm.output_messages.0.message.role":                                    "assistant",
				"llm.output_messages.0.message.contents.0.message_content.type":         "tool_use",
				"llm.output_messages.0.message.contents.0.tool_call.id":                 "toolu_01",
				"llm.output_messages.0.message.contents.0.tool_call.function.name":      "get_weather",
				"llm.output_messages.0.message.contents.0.tool_call.function.arguments": `{"city": "Paris"}`,
				"llm.output_messages.0.message.contents.1.message_content.type":         "text",
				"llm.output_messages.0.message.contents.1.message_content.text":         "Checking.",
			},
			formatter: FormatterOpenInference,
			wantInput: `[]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "tool_call", "name": "get_weather", "id": "toolu_01", "arguments": {"city": "Paris"}},
			  {"type": "text", "content": "Checking."}
			]}]`,
		},
		{
			name: "UnknownContentType_GenericPart",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                                            "user",
				"llm.input_messages.0.message.contents.0.message_content.type":                 "document",
				"llm.input_messages.0.message.contents.0.message_content.document.document.id": "file_1",
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[{"role": "user", "parts": [{"type": "document", "document": {"document": {"id": "file_1"}}}]}]`,
			wantOutput: `[]`,
		},
		{
			name: "ContentRepeatsOnlyTextItem_NotDuplicated",
			attributes: map[string]any{
				"llm.output_messages.0.message.role":                            "assistant",
				"llm.output_messages.0.message.content":                         "hello",
				"llm.output_messages.0.message.contents.0.message_content.type": "text",
				"llm.output_messages.0.message.contents.0.message_content.text": "hello",
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "hello"}]}]`,
		},
		{
			name: "ContentBesideOtherItems_TextPartFirst",
			attributes: map[string]any{
				"llm.output_messages.0.message.role":                            "assistant",
				"llm.output_messages.0.message.content":                         "hello",
				"llm.output_messages.0.message.contents.0.message_content.type": "reasoning",
				"llm.output_messages.0.message.contents.0.message_content.text": "greet",
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "hello"}, {"type": "reasoning", "content": "greet"}]}]`,
		},
		{
			// openinference-instrumentation-langchain _tracer.py: the legacy OpenAI function_call
			name: "LegacyFunctionCall_ToolCallPart",
			attributes: map[string]any{
				"llm.output_messages.0.message.role":                         "assistant",
				"llm.output_messages.0.message.function_call_name":           "multiply",
				"llm.output_messages.0.message.function_call_arguments_json": `{"x": 2}`,
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "multiply", "arguments": {"x": 2}}]}]`,
		},
		{
			// spec/tool_calling.md tool results: message.name names the function; a result given as
			// ordered text items is joined
			name: "ToolResultWithNameAndContents_ResponseJoined",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":                            "tool",
				"llm.input_messages.0.message.name":                            "get_weather",
				"llm.input_messages.0.message.tool_call_id":                    "call_1",
				"llm.input_messages.0.message.contents.0.message_content.type": "text",
				"llm.input_messages.0.message.contents.0.message_content.text": "18C",
				"llm.input_messages.0.message.contents.1.message_content.type": "text",
				"llm.input_messages.0.message.contents.1.message_content.text": "Clear",
			},
			formatter:  FormatterOpenInference,
			wantInput:  `[{"role": "tool", "name": "get_weather", "parts": [{"type": "tool_call_response", "id": "call_1", "response": "18C\nClear"}]}]`,
			wantOutput: `[]`,
		},
		{
			name: "RoleAliases_Mapped",
			attributes: map[string]any{
				"llm.input_messages.0.message.role":    "human",
				"llm.input_messages.0.message.content": "hi",
				"llm.input_messages.1.message.role":    "ai",
				"llm.input_messages.1.message.content": "hello",
				"llm.input_messages.2.message.role":    "model",
				"llm.input_messages.2.message.content": "still here",
			},
			formatter: FormatterOpenInference,
			wantInput: `[
			  {"role": "user", "parts": [{"type": "text", "content": "hi"}]},
			  {"role": "assistant", "parts": [{"type": "text", "content": "hello"}, {"type": "text", "content": "still here"}]}
			]`,
			wantOutput: `[]`,
		},
	})
}
