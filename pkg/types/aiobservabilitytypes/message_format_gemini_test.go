package aiobservabilitytypes

import "testing"

// Cases follow the Gemini generateContent shapes, REST camelCase and SDK snake_case; no capture in
// SigNoz/scripts records raw Gemini bodies.
// https://ai.google.dev/api/generate-content
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2303
func TestFormat_Gemini(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// systemInstruction as a Content; STOP is stop
			// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L6527
			// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L510
			name:   "SystemInstructionContent_CandidateText_Stop",
			input:  `{"contents":[{"role":"user","parts":[{"text":"Hi"}]}],"systemInstruction":{"parts":[{"text":"You are terse."}]},"generationConfig":{"temperature":0}}`,
			output: `{"candidates":[{"content":{"parts":[{"text":"Hello."}],"role":"model"},"finishReason":"STOP","index":0}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":2},"modelVersion":"gemini-2.5-flash"}`,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are terse."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Hi"}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello."}], "finish_reason": "stop"}]`,
		},
		{
			// SDK snake_case spelling; the function response sits in the next user turn
			// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L1830
			// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2032
			name:   "FunctionRoundSnakeCase_ResponseSplitFromUserTurn",
			input:  `{"model":"gemini-2.5-pro","contents":[{"role":"user","parts":[{"text":"Weather in Oslo?"}]},{"role":"model","parts":[{"function_call":{"name":"get_weather","args":{"city":"Oslo"}}}]},{"role":"user","parts":[{"function_response":{"name":"get_weather","response":{"temp_c":4}}},{"text":"And Bergen?"}]}],"system_instruction":"Use tools."}`,
			output: `{"candidates":[{"content":{"role":"model","parts":[{"function_call":{"id":"fc_1","name":"get_weather","args":{"city":"Bergen"}}}]},"finish_reason":"STOP"}]}`,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "Use tools."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Weather in Oslo?"}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "arguments": {"city": "Oslo"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "response": {"temp_c": 4}}]},
			  {"role": "user", "parts": [{"type": "text", "content": "And Bergen?"}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "id": "fc_1", "name": "get_weather", "arguments": {"city": "Bergen"}}], "finish_reason": "stop"}]`,
		},
		{
			// inline and file data, a thought part, an executable code part kept as sent; two candidates, the
			// second stopped for SAFETY
			// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2112
			// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L1731
			// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2344
			// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L510
			name:   "MediaAndThought_TwoCandidates",
			input:  `{"contents":[{"parts":[{"inlineData":{"mimeType":"image/png","data":"iVBORw0KGgo="}},{"fileData":{"mimeType":"video/mp4","fileUri":"gs://bucket/a.mp4"}},{"text":"Describe."}]}]}`,
			output: `{"candidates":[{"content":{"role":"model","parts":[{"text":"Looking.","thought":true},{"executableCode":{"language":"PYTHON","code":"print(1)"}},{"text":"A logo and a clip."}]},"finishReason":"MAX_TOKENS"},{"content":{"role":"model","parts":[]},"finishReason":"SAFETY"}]}`,
			wantInput: `[{"role": "user", "parts": [
			  {"type": "blob", "modality": "image", "mime_type": "image/png", "content": "iVBORw0KGgo="},
			  {"type": "uri", "modality": "video", "mime_type": "video/mp4", "uri": "gs://bucket/a.mp4"},
			  {"type": "text", "content": "Describe."}
			]}]`,
			wantOutput: `[
			  {"role": "assistant", "parts": [{"type": "reasoning", "content": "Looking."}, {"executableCode": {"language": "PYTHON", "code": "print(1)"}}, {"type": "text", "content": "A logo and a clip."}], "finish_reason": "length"},
			  {"role": "assistant", "parts": [], "finish_reason": "content_filter"}
			]`,
		},
		{
			name:       "StringContents_UserText",
			input:      `{"model":"gemini-2.5-flash","contents":"Hi"}`,
			output:     `{"role":"model","parts":[{"text":"Hello."}]}`,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "Hi"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello."}]}]`,
		},
		{
			// a bare Content list is told from semconv messages by its untyped parts
			name:       "BareContentList_NotSemconv",
			input:      `[{"role":"user","parts":[{"text":"Hi"}]}]`,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "Hi"}]}]`,
			wantOutput: `[]`,
		},
	})
}
