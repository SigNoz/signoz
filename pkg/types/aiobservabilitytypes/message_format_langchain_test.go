package aiobservabilitytypes

import "testing"

// Captured cases are gen_ai.input.messages and gen_ai.output.messages as the collector stored them for
// the SigNoz/scripts langsmith capture: the LangSmith OTel exporter's serialised run inputs and outputs.
func TestFormat_LangChain(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// langsmith capture, ChatOpenAI span after the tool ran
			name:      "SerialisedMessages_RolesFromClasses_ToolCallAndToolMessage",
			input:     `{"messages":[[{"lc":1,"type":"constructor","id":["langchain","schema","messages","SystemMessage"],"kwargs":{"content":"You are a weather assistant. Call get_weather once per city.","type":"system"}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","HumanMessage"],"kwargs":{"content":"What's the weather in Bengaluru?","type":"human"}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"","additional_kwargs":{"refusal":null},"response_metadata":{"finish_reason":"tool_calls","logprobs":null},"type":"ai","id":"lc_run--019e844a","tool_calls":[{"name":"get_weather","args":{"city":"Bengaluru"},"id":"call_nbrbkc5fom95q8uMA2bCvH6s","type":"tool_call"}],"invalid_tool_calls":[]}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","ToolMessage"],"kwargs":{"content":"{\"city\": \"Bengaluru\", \"temp_c\": 18, \"summary\": \"Clear\"}","type":"tool","tool_call_id":"call_nbrbkc5fom95q8uMA2bCvH6s","status":"success"}}]]}`,
			output:    `{"generations":[[{"text":"The weather in Bengaluru is clear, 18°C.","generation_info":{"finish_reason":"stop","logprobs":null},"type":"ChatGeneration","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"The weather in Bengaluru is clear, 18°C.","additional_kwargs":{"refusal":null},"response_metadata":{"finish_reason":"stop","model_name":"gpt-4o-mini-2024-07-18"},"type":"ai","tool_calls":[],"invalid_tool_calls":[]}}}]],"llm_output":{"model_name":"gpt-4o-mini-2024-07-18"},"run":null,"type":"LLMResult"}`,
			formatter: FormatterLangChain,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are a weather assistant. Call get_weather once per city."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "What's the weather in Bengaluru?"}]},
			  {"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_nbrbkc5fom95q8uMA2bCvH6s", "arguments": {"city": "Bengaluru"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_nbrbkc5fom95q8uMA2bCvH6s", "response": {"city": "Bengaluru", "temp_c": 18, "summary": "Clear"}}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "The weather in Bengaluru is clear, 18°C."}], "finish_reason": "stop"}]`,
		},
		{
			// langsmith capture, ChatOpenAI span answering with a tool call: the generation text is empty
			name:       "GenerationWithToolCalls_ToolCallPart_FinishFromGenerationInfo",
			output:     `{"generations":[[{"text":"","generation_info":{"finish_reason":"tool_calls"},"type":"ChatGeneration","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"","response_metadata":{},"type":"ai","tool_calls":[{"name":"get_weather","args":{"city":"Bengaluru"},"id":"call_1","type":"tool_call"}]}}}]]}`,
			formatter:  FormatterLangChain,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Bengaluru"}}], "finish_reason": "tool_call"}]`,
		},
		{
			// langsmith capture, ChatOpenAI span of a failed call: the error body sits in response_metadata
			name:       "GenerationWithErrorBody_EmptyMessage_FinishError",
			output:     `{"generations":[[{"text":"","generation_info":null,"type":"ChatGeneration","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"","response_metadata":{"body":{"error":{"message":"Incorrect API key provided","type":"invalid_request_error","code":"invalid_api_key"},"status":401},"headers":{}},"type":"ai"}}}]]}`,
			formatter:  FormatterLangChain,
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [], "finish_reason": "error"}]`,
		},
		{
			// langchain_core.messages: ChatMessage carries its role, content blocks may repeat a tool call
			// the tool_calls list already has, and the legacy function_call lives in additional_kwargs
			name:      "ChatMessageRole_ContentBlocks_LegacyFunctionCall",
			input:     `{"messages":[[{"lc":1,"type":"constructor","id":["langchain","schema","messages","ChatMessage"],"kwargs":{"role":"developer","content":[{"type":"text","text":"Be brief."}]}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":[{"type":"text","text":"Calling."},{"type":"tool_use","id":"toolu_1","name":"get_weather","input":{"city":"Paris"}}],"tool_calls":[{"name":"get_weather","args":{"city":"Paris"},"id":"toolu_1"}]}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"","additional_kwargs":{"function_call":{"name":"multiply","arguments":"{\"x\": 2}"}},"name":"math"}}]]}`,
			formatter: FormatterLangChain,
			wantInput: `[
			  {"role": "developer", "parts": [{"type": "text", "content": "Be brief."}]},
			  {"role": "assistant", "parts": [{"type": "text", "content": "Calling."}, {"type": "tool_call", "name": "get_weather", "id": "toolu_1", "arguments": {"city": "Paris"}}]},
			  {"role": "assistant", "name": "math", "parts": [{"type": "tool_call", "name": "multiply", "arguments": {"x": 2}}]}
			]`,
			wantOutput: `[]`,
		},
		{
			name:       "BareSerialisedList_ConvertedAsMessages",
			input:      `[{"lc":1,"type":"constructor","id":["langchain","schema","messages","HumanMessageChunk"],"kwargs":{"content":"hi"}}]`,
			formatter:  FormatterLangChain,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[]`,
		},
	})
}
