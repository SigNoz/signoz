package aiobservabilitytypes

import "testing"

// Captured cases are gen_ai.input.messages and gen_ai.output.messages as the collector stored them for
// the SigNoz/scripts langsmith capture, the LangSmith OTel exporter's serialised run inputs and outputs;
// the others follow langchain_core and the partner packages at the linked lines.
func TestFormat_LangChain(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// langsmith capture, ChatOpenAI span after the tool ran
			name:   "SerialisedMessages_RolesFromClasses_ToolCallAndToolMessage",
			input:  `{"messages":[[{"lc":1,"type":"constructor","id":["langchain","schema","messages","SystemMessage"],"kwargs":{"content":"You are a weather assistant. Call get_weather once per city.","type":"system"}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","HumanMessage"],"kwargs":{"content":"What's the weather in Bengaluru?","type":"human"}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"","additional_kwargs":{"refusal":null},"response_metadata":{"finish_reason":"tool_calls","logprobs":null},"type":"ai","id":"lc_run--019e844a","tool_calls":[{"name":"get_weather","args":{"city":"Bengaluru"},"id":"call_nbrbkc5fom95q8uMA2bCvH6s","type":"tool_call"}],"invalid_tool_calls":[]}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","ToolMessage"],"kwargs":{"content":"{\"city\": \"Bengaluru\", \"temp_c\": 18, \"summary\": \"Clear\"}","type":"tool","tool_call_id":"call_nbrbkc5fom95q8uMA2bCvH6s","status":"success"}}]]}`,
			output: `{"generations":[[{"text":"The weather in Bengaluru is clear, 18°C.","generation_info":{"finish_reason":"stop","logprobs":null},"type":"ChatGeneration","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"The weather in Bengaluru is clear, 18°C.","additional_kwargs":{"refusal":null},"response_metadata":{"finish_reason":"stop","model_name":"gpt-4o-mini-2024-07-18"},"type":"ai","tool_calls":[],"invalid_tool_calls":[]}}}]],"llm_output":{"model_name":"gpt-4o-mini-2024-07-18"},"run":null,"type":"LLMResult"}`,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are a weather assistant. Call get_weather once per city."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "What's the weather in Bengaluru?"}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_nbrbkc5fom95q8uMA2bCvH6s", "arguments": {"city": "Bengaluru"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_nbrbkc5fom95q8uMA2bCvH6s", "response": {"city": "Bengaluru", "temp_c": 18, "summary": "Clear"}}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "The weather in Bengaluru is clear, 18°C."}], "finish_reason": "stop"}]`,
		},
		{
			// langsmith capture, ChatOpenAI span answering with a tool call: the generation text is empty and
			// the finish reason sits in generation_info
			// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/outputs/generation.py#L28
			name:       "GenerationWithToolCalls_ToolCallPart_FinishFromGenerationInfo",
			output:     `{"generations":[[{"text":"","generation_info":{"finish_reason":"tool_calls"},"type":"ChatGeneration","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"","response_metadata":{},"type":"ai","tool_calls":[{"name":"get_weather","args":{"city":"Bengaluru"},"id":"call_1","type":"tool_call"}]}}}]]}`,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Bengaluru"}}], "finish_reason": "tool_call"}]`,
		},
		{
			// langsmith capture, ChatOpenAI span of a failed call: the error body sits in response_metadata
			name:       "GenerationWithErrorBody_EmptyMessage_FinishError",
			output:     `{"generations":[[{"text":"","generation_info":null,"type":"ChatGeneration","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"","response_metadata":{"body":{"error":{"message":"Incorrect API key provided","type":"invalid_request_error","code":"invalid_api_key"},"status":401},"headers":{}},"type":"ai"}}}]]}`,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [], "finish_reason": "error"}]`,
		},
		{
			// a ChatMessage carries its role in kwargs; an AIMessage from langchain-anthropic keeps the tool_use
			// block in its content beside tool_calls
			// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/chat.py#L18
			// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/partners/anthropic/langchain_anthropic/chat_models.py#L2571
			name:  "ChatMessageRole_ToolUseBlockBesideToolCalls_OneToolCallPart",
			input: `{"messages":[[{"lc":1,"type":"constructor","id":["langchain","schema","messages","ChatMessage"],"kwargs":{"role":"developer","content":[{"type":"text","text":"Be brief."}]}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":[{"type":"text","text":"Calling."},{"type":"tool_use","id":"toolu_1","name":"get_weather","input":{"city":"Paris"}}],"tool_calls":[{"name":"get_weather","args":{"city":"Paris"},"id":"toolu_1"}]}}]]}`,
			wantInput: `[
			  {"role": "developer", "parts": [{"type": "text", "content": "Be brief."}]},
			  {"role": "assistant", "parts": [{"type": "text", "content": "Calling."}, {"type": "tool_call", "name": "get_weather", "id": "toolu_1", "arguments": {"city": "Paris"}}]}
			]`,
			wantOutput: `[]`,
		},
		{
			// the finish reason under the key each partner writes: anthropic stop_reason, ollama done_reason
			// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/partners/anthropic/langchain_anthropic/chat_models.py#L2510
			// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/partners/ollama/langchain_ollama/chat_models.py#L24
			name:       "PartnerFinishReasonKeys_StopReasonAndDoneReason",
			output:     `{"generations":[[{"text":"Hi.","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"Hi.","response_metadata":{"stop_reason":"end_turn","model":"claude-sonnet-4-5"}}}}],[{"text":"Hel","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"Hel","response_metadata":{"model":"llama3","done_reason":"length"}}}}]]}`,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hi."}], "finish_reason": "stop"}, {"role": "assistant", "parts": [{"type": "text", "content": "Hel"}], "finish_reason": "length"}]`,
		},
		{
			// langchain_core's standard content blocks, as partners write them under output_version v1
			// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/content.py#L456
			// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/content.py#L498
			// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/content.py#L721
			name:      "StandardContentBlocks_ReasoningAndMediaParts",
			output:    `{"generations":[[{"text":"It is a duck.","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":[{"type":"reasoning","reasoning":"Looks like a bird."},{"type":"text","text":"It is a duck."},{"type":"image","base64":"iVBORw0KGgo=","mime_type":"image/png"},{"type":"file","url":"https://example.com/a.pdf","mime_type":"application/pdf"}],"response_metadata":{"finish_reason":"stop","output_version":"v1"}}}}]]}`,
			wantInput: `[]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "reasoning", "content": "Looks like a bird."},
			  {"type": "text", "content": "It is a duck."},
			  {"type": "blob", "modality": "image", "mime_type": "image/png", "content": "iVBORw0KGgo="},
			  {"type": "uri", "modality": "document", "uri": "https://example.com/a.pdf"}
			], "finish_reason": "stop"}]`,
		},
	})
}
