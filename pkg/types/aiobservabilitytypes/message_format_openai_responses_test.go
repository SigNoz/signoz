package aiobservabilitytypes

import "testing"

// Cases follow the OpenAI Responses schemas; the first mirrors the raw bodies in the SigNoz/scripts
// openinference-openai-agents capture, which OpenInference's flattened messages otherwise cover.
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L47597
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L69691
func TestFormat_OpenAIResponses(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// openinference-openai-agents capture, Response span: instructions outside the history, a reasoning
			// item without a summary, then the message
			name:   "InstructionsAndStringInput_ReasoningWithoutSummaryDropped",
			input:  `{"include": [], "input": [{"content": "A bat and a ball cost $1.10. How much is the ball?", "role": "user"}], "instructions": "You solve problems step by step and give a final answer.", "model": "o3-mini", "tools": []}`,
			output: `{"id":"resp_1","object":"response","status":"completed","model":"o3-mini-2025-01-31","output":[{"id":"rs_1","summary":[],"type":"reasoning"},{"id":"msg_1","content":[{"annotations":[],"text":"Final Answer: The ball costs $0.05.","type":"output_text","logprobs":[]}],"role":"assistant","status":"completed","type":"message"}],"usage":{"input_tokens":49,"output_tokens":431}}`,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You solve problems step by step and give a final answer."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "A bat and a ball cost $1.10. How much is the ball?"}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Final Answer: The ball costs $0.05."}], "finish_reason": "stop"}]`,
		},
		{
			// an InputMessage with every InputContent type, then function and custom tool calls with their
			// outputs, a compaction item and a computer_call_output
			// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L53827
			// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L54142
			name:  "InputItems_EveryContentType_FunctionCallRound",
			input: `{"model":"gpt-4o-mini","input":[{"role":"user","content":[{"type":"input_text","text":"What is in this image and these files?"},{"type":"input_image","image_url":"https://example.com/duck.jpg","detail":"auto"},{"type":"input_image","file_id":"file-img","detail":"low"},{"type":"input_file","file_id":"file-abc"},{"type":"input_file","filename":"a.pdf","file_data":"data:application/pdf;base64,JVBERi0="},{"type":"input_file","file_url":"https://example.com/a.pdf"}]},{"type":"function_call","call_id":"call_1","name":"get_weather","arguments":"{\"city\":\"Paris\"}"},{"type":"function_call_output","call_id":"call_1","output":"{\"temp_c\":18}"},{"type":"custom_tool_call","call_id":"c1","name":"shell","input":"ls"},{"type":"custom_tool_call_output","call_id":"c1","output":"a.txt"},{"type":"compaction","id":"cmp_1","encrypted_content":"x"},{"type":"computer_call_output","call_id":"cc_1","output":{"type":"computer_screenshot","image_url":"data:image/png;base64,iVBORw0KGgo="}}]}`,
			wantInput: `[
			  {"role": "user", "parts": [
			    {"type": "text", "content": "What is in this image and these files?"},
			    {"type": "uri", "modality": "image", "uri": "https://example.com/duck.jpg"},
			    {"type": "file", "modality": "image", "file_id": "file-img"},
			    {"type": "file", "modality": "document", "file_id": "file-abc", "mime_type": "application/pdf"},
			    {"type": "blob", "modality": "document", "mime_type": "application/pdf", "content": "JVBERi0="},
			    {"type": "uri", "modality": "document", "uri": "https://example.com/a.pdf"}
			  ]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Paris"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_1", "response": {"temp_c": 18}}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "shell", "id": "c1", "arguments": "ls"}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "c1", "response": "a.txt"}]},
			  {"role": "assistant", "parts": [{"type": "compaction", "id": "cmp_1"}]},
			  {"role": "tool", "parts": [{"type": "server_tool_call_response", "id": "cc_1", "server_tool_call_response": {"type": "computer_call_output", "call_id": "cc_1", "output": {"type": "computer_screenshot", "image_url": "data:image/png;base64,iVBORw0KGgo="}}}]}
			]`,
			wantOutput: `[]`,
		},
		{
			// output items folded into the single choice: a ReasoningItem summary, a WebSearchToolCall, the
			// OutputMessage with output_text and refusal, then a FunctionToolCall
			// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L57596
			name:      "OutputItems_FoldedIntoOneMessage_StatusCompleted",
			output:    `{"id":"resp_2","object":"response","status":"completed","output":[{"id":"rs_1","type":"reasoning","summary":[{"type":"summary_text","text":"Need the weather first."}],"encrypted_content":"gAAA"},{"id":"ws_1","type":"web_search_call","status":"completed","action":{"type":"search","query":"weather Paris"}},{"id":"msg_1","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"Checking.","annotations":[]},{"type":"refusal","refusal":"I cannot do that."}]},{"type":"function_call","call_id":"call_1","name":"get_weather","arguments":"{\"city\":\"Paris\"}","id":"fc_1","status":"completed"}]}`,
			wantInput: `[]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "reasoning", "content": "Need the weather first."},
			  {"type": "server_tool_call", "name": "web_search", "server_tool_call": {"id": "ws_1", "type": "web_search_call", "status": "completed", "action": {"type": "search", "query": "weather Paris"}}},
			  {"type": "text", "content": "Checking."},
			  {"type": "text", "content": "I cannot do that."},
			  {"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Paris"}}
			], "finish_reason": "stop"}]`,
		},
		{
			// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L69763
			name:       "IncompleteResponse_FinishFromIncompleteDetails",
			output:     `{"object":"response","status":"incomplete","incomplete_details":{"reason":"max_output_tokens"},"output":[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Partial"}]}]}`,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Partial"}], "finish_reason": "length"}]`,
		},
		{
			name:       "StringInput_UserMessage",
			input:      `{"model":"gpt-4o-mini","input":"Say hi","instructions":"Be brief."}`,
			wantInput:  `[{"role": "system", "parts": [{"type": "text", "content": "Be brief."}]}, {"role": "user", "parts": [{"type": "text", "content": "Say hi"}]}]`,
			wantOutput: `[]`,
		},
		{
			// LiteLLM langfuse_otel: the function_call items of a tool-calling turn as a bare list
			name:       "BareFunctionCallItems_OneAssistantMessage",
			output:     `[{"id": "chatcmpl-1", "name": "set_stage", "call_id": "call_7", "type": "function_call", "arguments": {"fields": {"stage": "consent"}}}]`,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "set_stage", "id": "call_7", "arguments": {"fields": {"stage": "consent"}}}]}]`,
		},
		{
			name:  "BareItemsWithMessage_ToolRound",
			input: `[{"type": "message", "role": "user", "content": [{"type": "input_text", "text": "Weather in Oslo?"}]}, {"type": "function_call", "call_id": "call_9", "name": "get_weather", "arguments": "{\"city\":\"Oslo\"}"}, {"type": "function_call_output", "call_id": "call_9", "output": "4C, cloudy"}]`,
			wantInput: `[
			  {"role": "user", "parts": [{"type": "text", "content": "Weather in Oslo?"}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_9", "arguments": {"city": "Oslo"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_9", "response": "4C, cloudy"}]}
			]`,
			wantOutput: `[]`,
		},
		{
			// openinference capture, CreateEmbeddings span: an embeddings request also has input and model
			name:       "EmbeddingsRequest_NotResponses_KeptAsGeneric",
			input:      `{"input": ["observability is the new monitoring"], "model": "text-embedding-3-small", "encoding_format": "base64"}`,
			warnings:   []string{"message format not recognised, kept as generic"},
			wantInput:  `[{"role": "", "parts": [{"type": "generic", "content": "{\"encoding_format\":\"base64\",\"input\":[\"observability is the new monitoring\"],\"model\":\"text-embedding-3-small\"}"}]}]`,
			wantOutput: `[]`,
		},
	})
}
