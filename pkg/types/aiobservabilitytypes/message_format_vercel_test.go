package aiobservabilitytypes

import "testing"

// Captured cases are the ai.* attributes as the collector stored them for the SigNoz/scripts vercel
// and mastra captures (AI SDK v4) and a local AI SDK v5 run against a stub provider.
func TestFormat_Vercel(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// vercel capture, ai.generateText.doGenerate span after a tool round: v1 tool-call args and tool-result result
			name: "V4ToolRound_ToolCallAndResultParts",
			attributes: map[string]any{
				"ai.operationId":           "ai.generateText.doGenerate",
				"ai.response.finishReason": "stop",
				GenAIInputMessages:         `[{"role":"user","content":[{"type":"text","text":"What is the weather in Paris and in London, in celsius? Use the tool for each."}]},{"role":"assistant","content":[{"type":"tool-call","toolCallId":"call_isBPb3o3cqhY8OpugQntLOgy","toolName":"get_current_weather","args":{"city":"Paris","unit":"c"}},{"type":"tool-call","toolCallId":"call_sH9xd5EWFkiSaWmYvg4CeWTl","toolName":"get_current_weather","args":{"city":"London","unit":"c"}}]},{"role":"tool","content":[{"type":"tool-result","toolCallId":"call_isBPb3o3cqhY8OpugQntLOgy","toolName":"get_current_weather","result":{"city":"Paris","unit":"c","temperature":18,"condition":"clear"}},{"type":"tool-result","toolCallId":"call_sH9xd5EWFkiSaWmYvg4CeWTl","toolName":"get_current_weather","result":{"city":"London","unit":"c","temperature":18,"condition":"clear"}}]}]`,
				GenAIOutputMessages:        "The current weather is as follows:\n\n- **Paris**: 18°C, clear\n- **London**: 18°C, clear",
			},
			formatter: FormatterVercel,
			wantInput: `[
			  {"role": "user", "parts": [{"type": "text", "content": "What is the weather in Paris and in London, in celsius? Use the tool for each."}]},
			  {"role": "assistant", "parts": [
			    {"type": "tool_call", "name": "get_current_weather", "id": "call_isBPb3o3cqhY8OpugQntLOgy", "arguments": {"city": "Paris", "unit": "c"}},
			    {"type": "tool_call", "name": "get_current_weather", "id": "call_sH9xd5EWFkiSaWmYvg4CeWTl", "arguments": {"city": "London", "unit": "c"}}
			  ]},
			  {"role": "tool", "parts": [
			    {"type": "tool_call_response", "id": "call_isBPb3o3cqhY8OpugQntLOgy", "response": {"city": "Paris", "unit": "c", "temperature": 18, "condition": "clear"}},
			    {"type": "tool_call_response", "id": "call_sH9xd5EWFkiSaWmYvg4CeWTl", "response": {"city": "London", "unit": "c", "temperature": 18, "condition": "clear"}}
			  ]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "The current weather is as follows:\n\n- **Paris**: 18°C, clear\n- **London**: 18°C, clear"}], "finish_reason": "stop"}]`,
		},
		{
			// vercel capture, ai.streamText.doStream span: the mapper moved ai.response.toolCalls onto the output
			name: "V4ToolCalls_ToolCallParts_EmptyTextIgnored",
			attributes: map[string]any{
				"ai.operationId":           "ai.streamText.doStream",
				"ai.response.finishReason": "tool-calls",
				"ai.response.text":         "",
				GenAIInputMessages:         `[{"role":"user","content":[{"type":"text","text":"What is the weather in Bengaluru in celsius?"}]}]`,
				GenAIOutputMessages:        `[{"type":"tool-call","toolCallId":"call_l0ycKcmt1uPCdGWR4SkwoLBv","toolName":"get_current_weather","args":{"city":"Bengaluru","unit":"c"}}]`,
			},
			formatter:  FormatterVercel,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "What is the weather in Bengaluru in celsius?"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_current_weather", "id": "call_l0ycKcmt1uPCdGWR4SkwoLBv", "arguments": {"city": "Bengaluru", "unit": "c"}}], "finish_reason": "tool_call"}]`,
		},
		{
			// vercel capture, ai.generateText parent span: ai.prompt is unmapped, the answer text was moved
			name: "ParentPromptWithSystem_SystemAndUserMessages",
			attributes: map[string]any{
				"ai.operationId":           "ai.generateText",
				"ai.prompt":                `{"system":"You are concise.","prompt":"Say hello in five words."}`,
				"ai.response.finishReason": "stop",
				GenAIOutputMessages:        "Hello! How are you today?",
			},
			formatter: FormatterVercel,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are concise."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Say hello in five words."}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello! How are you today?"}], "finish_reason": "stop"}]`,
		},
		{
			// vercel capture, ai.generateText parent span of a vision call: the image is a serialised Node Buffer
			name: "ParentPromptMessages_BufferImage_BlobPart",
			attributes: map[string]any{
				"ai.operationId":    "ai.generateText",
				"ai.prompt":         `{"messages":[{"role":"user","content":[{"type":"text","text":"What animal is in this image? One sentence."},{"type":"image","image":{"type":"Buffer","data":[137,80,78,71]},"mediaType":"image/png"}]}]}`,
				GenAIOutputMessages: "A duck.",
			},
			formatter: FormatterVercel,
			wantInput: `[{"role": "user", "parts": [
			  {"type": "text", "content": "What animal is in this image? One sentence."},
			  {"type": "blob", "modality": "image", "mime_type": "image/png", "content": "iVBORw=="}
			]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "A duck."}]}]`,
		},
		{
			// AI SDK v5 (ai@5.0.274) doGenerate after a tool round: tool-call input and tool-result output
			// (vercel/ai@6617f11 language-model-v2-prompt.ts)
			name: "V5ToolRound_InputAndOutputSpellings",
			attributes: map[string]any{
				"ai.operationId":           "ai.generateText.doGenerate",
				"ai.response.finishReason": "stop",
				GenAIInputMessages:         `[{"role":"system","content":"Use the tool."},{"role":"user","content":[{"type":"text","text":"Weather in Paris?"}]},{"role":"assistant","content":[{"type":"tool-call","toolCallId":"call_stub1","toolName":"getWeather","input":{"city":"Paris"}}]},{"role":"tool","content":[{"type":"tool-result","toolCallId":"call_stub1","toolName":"getWeather","output":{"type":"json","value":{"city":"Paris","tempC":18,"summary":"Clear"}}}]}]`,
				GenAIOutputMessages:        "Paris is clear at 18C.",
			},
			formatter: FormatterVercel,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "Use the tool."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Weather in Paris?"}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "getWeather", "id": "call_stub1", "arguments": {"city": "Paris"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_stub1", "response": {"city": "Paris", "tempC": 18, "summary": "Clear"}}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Paris is clear at 18C."}], "finish_reason": "stop"}]`,
		},
		{
			// AI SDK v5 ai.response.toolCalls carries the arguments as a JSON string under input; the text
			// the mapper left behind in ai.response.text comes first
			name: "V5ToolCallsBesideText_TextThenToolCall",
			attributes: map[string]any{
				"ai.operationId":           "ai.streamText.doStream",
				"ai.response.finishReason": "tool-calls",
				"ai.response.text":         "Let me check.",
				GenAIInputMessages:         `[{"role":"user","content":[{"type":"text","text":"Weather in Paris? Use the tool."}]}]`,
				GenAIOutputMessages:        `[{"toolCallId":"call_stream1","toolName":"getWeather","input":"{\"city\":\"Paris\"}"}]`,
			},
			formatter: FormatterVercel,
			wantInput: `[{"role": "user", "parts": [{"type": "text", "content": "Weather in Paris? Use the tool."}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "text", "content": "Let me check."},
			  {"type": "tool_call", "name": "getWeather", "id": "call_stream1", "arguments": {"city": "Paris"}}
			], "finish_reason": "tool_call"}]`,
		},
		{
			// AI SDK v5 file parts: bare base64 with its media type, a URL, and a tool result given as text
			name: "V5FileParts_BlobsByMediaType_URLAsUri",
			attributes: map[string]any{
				"ai.operationId":   "ai.generateText.doGenerate",
				GenAIInputMessages: `[{"role":"user","content":[{"type":"text","text":"What is in these?"},{"type":"file","mediaType":"image/png","data":"iVBORw0KGgo="},{"type":"file","mediaType":"application/pdf","filename":"a.pdf","data":"JVBERi0xLjQgc3R1Yg=="},{"type":"file","mediaType":"audio/wav","data":"https://example.com/a.wav"},{"type":"reasoning","text":"thinking"}]},{"role":"tool","content":[{"type":"tool-result","toolCallId":"call_1","toolName":"read","output":{"type":"text","value":"done"}}]}]`,
			},
			formatter: FormatterVercel,
			wantInput: `[
			  {"role": "user", "parts": [
			    {"type": "text", "content": "What is in these?"},
			    {"type": "blob", "modality": "image", "mime_type": "image/png", "content": "iVBORw0KGgo="},
			    {"type": "blob", "modality": "document", "mime_type": "application/pdf", "content": "JVBERi0xLjQgc3R1Yg=="},
			    {"type": "uri", "modality": "audio", "uri": "https://example.com/a.wav"},
			    {"type": "reasoning", "content": "thinking"}
			  ]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_1", "response": "done"}]}
			]`,
			wantOutput: `[]`,
		},
		{
			// mastra capture, ai.generateText.doGenerate span: the AI SDK v4 shapes under Mastra's own span names
			name: "MastraToolCalls_ToolCallPart",
			attributes: map[string]any{
				"ai.operationId":           "ai.generateText.doGenerate",
				"ai.response.finishReason": "tool-calls",
				GenAIInputMessages:         `[{"role":"system","content":"You are a weather assistant. When asked about weather, call get-weather once per city and summarise."},{"role":"user","content":[{"type":"text","text":"What is the weather in Bengaluru?"}]}]`,
				GenAIOutputMessages:        `[{"toolCallType":"function","toolCallId":"call_526phoykytobsvLouzES805J","toolName":"getWeather","args":"{\"city\":\"Bengaluru\"}"}]`,
			},
			formatter: FormatterVercel,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are a weather assistant. When asked about weather, call get-weather once per city and summarise."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "What is the weather in Bengaluru?"}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "getWeather", "id": "call_526phoykytobsvLouzES805J", "arguments": {"city": "Bengaluru"}}], "finish_reason": "tool_call"}]`,
		},
		{
			// vercel capture, ai.generateText span of a failed call
			name:       "PromptOnlyNoResponse_InputOnly",
			attributes: map[string]any{"ai.operationId": "ai.generateText", "ai.prompt": `{"prompt":"this should fail"}`},
			formatter:  FormatterVercel,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "this should fail"}]}]`,
			wantOutput: `[]`,
		},
	})
}
