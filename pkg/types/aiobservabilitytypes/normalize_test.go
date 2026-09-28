package aiobservabilitytypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeMessages(t *testing.T) {
	text := func(role MessageRole, content string) Message {
		return Message{Role: role, Content: []Part{{Type: PartTypeText, Content: content}}}
	}

	testCases := []struct {
		name string
		raw  any
		want []Message
	}{
		{
			name: "SemconvInput_Litellm",
			raw:  `[{"role": "system", "parts": [{"type": "text", "content": "You are a concise assistant."}]}, {"role": "user", "parts": [{"type": "text", "content": "Give me a one-line definition of observability."}]}]`,
			want: []Message{
				text(MessageRoleSystem, "You are a concise assistant."),
				text(MessageRoleUser, "Give me a one-line definition of observability."),
			},
		},
		{
			name: "SemconvOutput_FinishReason_Bifrost",
			raw:  `[{"role": "assistant", "parts": [{"content": "Observability is X.", "type": "text"}], "finish_reason": "stop"}]`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeText, Content: "Observability is X."}}, FinishReason: FinishReasonStop}},
		},
		{
			name: "SemconvToolCallAndResponse_Langchain",
			raw:  `[{"role": "user", "parts": [{"type": "text", "content": "What's the weather in Bengaluru?"}]}, {"role": "assistant", "parts": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Bengaluru"}}]}, {"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_1", "response": "{\"city\": \"Bengaluru\", \"temp_c\": 18}"}]}]`,
			want: []Message{
				text(MessageRoleUser, "What's the weather in Bengaluru?"),
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "call_1", Name: "get_weather", Arguments: map[string]any{"city": "Bengaluru"}}}},
				{Role: MessageRoleTool, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "call_1", Content: `{"city": "Bengaluru", "temp_c": 18}`}}},
			},
		},
		{
			name: "SemconvOutput_TwoToolCalls_Openllmetry",
			raw:  `[{"role": "assistant", "parts": [{"type": "tool_call", "name": "search_web", "id": "call_a", "arguments": {"query": "SigNoz"}}, {"type": "tool_call", "name": "get_weather", "id": "call_b", "arguments": {"city": "Bengaluru"}}], "finish_reason": "tool_call"}]`,
			want: []Message{{Role: MessageRoleAssistant, FinishReason: FinishReasonToolCall, Content: []Part{
				{Type: PartTypeToolCall, ID: "call_a", Name: "search_web", Arguments: map[string]any{"query": "SigNoz"}},
				{Type: PartTypeToolCall, ID: "call_b", Name: "get_weather", Arguments: map[string]any{"city": "Bengaluru"}},
			}}},
		},
		{
			name: "OpenAIChatList_FlattenedToolCalls_BifrostGateway",
			raw:  `[{"role":"user","content":"What's the weather in Bengaluru? Use the tool."},{"role":"assistant","content":"","tool_calls":[{"id":"call_y","type":"function","name":"get_current_weather","args":"{\"city\":\"Bengaluru\"}"}]},{"role":"tool","content":"{\"city\": \"Bengaluru\", \"temp_c\": 28}"}]`,
			want: []Message{
				text(MessageRoleUser, "What's the weather in Bengaluru? Use the tool."),
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "call_y", Name: "get_current_weather", Arguments: map[string]any{"city": "Bengaluru"}}}},
				{Role: MessageRoleTool, Content: []Part{{Type: PartTypeToolResult, Content: `{"city": "Bengaluru", "temp_c": 28}`}}},
			},
		},
		{
			name: "OpenAIChatRequest_NestedFunctionToolCalls_OpenrouterGateway",
			raw:  `{"messages":[{"role":"user","content":"Weather?"},{"content":null,"refusal":null,"role":"assistant","tool_calls":[{"id":"call_A","function":{"arguments":"{\"city\":\"Bengaluru\"}","name":"get_current_weather"},"type":"function","index":0}]},{"role":"tool","tool_call_id":"call_A","content":"{\"temp_c\": 28}"}]}`,
			want: []Message{
				text(MessageRoleUser, "Weather?"),
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "call_A", Name: "get_current_weather", Arguments: map[string]any{"city": "Bengaluru"}}}},
				{Role: MessageRoleTool, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "call_A", Content: `{"temp_c": 28}`}}},
			},
		},
		{
			name: "OpenAIChatRequest_IgnoresModelAndTools_Openinference",
			raw:  `{"messages": [{"role": "user", "content": "What is the weather in Bengaluru in celsius?"}], "model": "gpt-4o-mini", "tool_choice": "auto", "tools": [{"type": "function", "function": {"name": "get_current_weather"}}]}`,
			want: []Message{text(MessageRoleUser, "What is the weather in Bengaluru in celsius?")},
		},
		{
			name: "OpenAIChatResponse_Openinference",
			raw:  `{"id":"chatcmpl-1","choices":[{"finish_reason":"stop","index":0,"logprobs":null,"message":{"content":"Hello! How are you today?","refusal":null,"role":"assistant","annotations":[]}}],"model":"gpt-4o-mini","object":"chat.completion","usage":{"total_tokens":28}}`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeText, Content: "Hello! How are you today?"}}, FinishReason: FinishReasonStop}},
		},
		{
			name: "OpenAIResponsesRequest_OpenAIAgents",
			raw:  `{"include": [], "input": [{"content": "What's the weather in Bangalore right now?", "role": "user"}], "instructions": "You are a concise weather assistant.", "model": "gpt-4o-mini", "tools": [{"name": "get_weather", "type": "function"}]}`,
			want: []Message{
				text(MessageRoleSystem, "You are a concise weather assistant."),
				text(MessageRoleUser, "What's the weather in Bangalore right now?"),
			},
		},
		{
			name: "OpenAIResponsesResponse_FunctionCall_OpenAIAgents",
			raw:  `{"id":"resp_1","object":"response","status":"completed","output":[{"arguments":"{\"city\":\"Bangalore\"}","call_id":"call_M","name":"get_weather","type":"function_call","id":"fc_1","status":"completed"}],"usage":{"total_tokens":113}}`,
			want: []Message{{Role: MessageRoleAssistant, FinishReason: FinishReasonStop, Content: []Part{{Type: PartTypeToolCall, ID: "call_M", Name: "get_weather", Arguments: map[string]any{"city": "Bangalore"}}}}},
		},
		{
			name: "OpenAIResponsesResponse_MessageAndReasoning",
			raw:  `{"object":"response","status":"completed","output":[{"type":"reasoning","id":"rs_1","summary":[{"type":"summary_text","text":"Thinking about it"}]},{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Paris."}]}]}`,
			want: []Message{
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeThinking, Content: "Thinking about it"}}},
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeText, Content: "Paris."}}, FinishReason: FinishReasonStop},
			},
		},
		{
			name: "VercelPromptMessages_ToolParts",
			raw:  `[{"role":"user","content":[{"type":"text","text":"What is the weather in Bengaluru in celsius?"}]},{"role":"assistant","content":[{"type":"tool-call","toolCallId":"call_l","toolName":"get_current_weather","args":{"city":"Bengaluru","unit":"c"}}]},{"role":"tool","content":[{"type":"tool-result","toolCallId":"call_l","toolName":"get_current_weather","result":{"city":"Bengaluru","temperature":27}}]}]`,
			want: []Message{
				text(MessageRoleUser, "What is the weather in Bengaluru in celsius?"),
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "call_l", Name: "get_current_weather", Arguments: map[string]any{"city": "Bengaluru", "unit": "c"}}}},
				{Role: MessageRoleTool, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "call_l", Name: "get_current_weather", Content: `{"city":"Bengaluru","temperature":27}`}}},
			},
		},
		{
			name: "MastraPromptMessages_MixedContent",
			raw:  `[{"role":"system","content":"You are a weather assistant."},{"role":"user","content":[{"type":"text","text":"What is the weather in Bengaluru?"}]}]`,
			want: []Message{
				text(MessageRoleSystem, "You are a weather assistant."),
				text(MessageRoleUser, "What is the weather in Bengaluru?"),
			},
		},
		{
			name: "AnthropicMessages_ThinkingAndToolUse",
			raw:  `[{"role":"user","content":"Hi"},{"role":"assistant","content":[{"type":"thinking","thinking":"Let me see"},{"type":"redacted_thinking","data":"x"},{"type":"tool_use","id":"toolu_1","name":"lookup","input":{"q":"a"}}],"stop_reason":"tool_use"},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_1","content":"found","is_error":true}]}]`,
			want: []Message{
				text(MessageRoleUser, "Hi"),
				{Role: MessageRoleAssistant, FinishReason: FinishReasonToolCall, Content: []Part{
					{Type: PartTypeThinking, Content: "Let me see"},
					{Type: PartTypeThinking, Redacted: true},
					{Type: PartTypeToolCall, ID: "toolu_1", Name: "lookup", Arguments: map[string]any{"q": "a"}},
				}},
				{Role: MessageRoleUser, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "toolu_1", Content: "found", IsError: true}}},
			},
		},
		{
			name: "GeminiContents_Converted",
			raw:  `[{"role":"user","parts":[{"text":"Weather in Paris?"}]},{"role":"model","parts":[{"functionCall":{"name":"get_weather","args":{"city":"Paris"}}}]},{"role":"user","parts":[{"functionResponse":{"name":"get_weather","response":{"temp":20}}}]}]`,
			want: []Message{
				text(MessageRoleUser, "Weather in Paris?"),
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, Name: "get_weather", Arguments: map[string]any{"city": "Paris"}}}},
				{Role: MessageRoleUser, Content: []Part{{Type: PartTypeToolResult, Name: "get_weather", Content: `{"temp":20}`}}},
			},
		},
		{
			name: "LangChainSerialisedPrompt_Langsmith",
			raw:  `{"messages":[[{"lc":1,"type":"constructor","id":["langchain","schema","messages","SystemMessage"],"kwargs":{"content":"You are concise.","type":"system"}},{"lc":1,"type":"constructor","id":["langchain","schema","messages","HumanMessage"],"kwargs":{"content":"Define observability.","type":"human"}}]]}`,
			want: []Message{
				text(MessageRoleSystem, "You are concise."),
				text(MessageRoleUser, "Define observability."),
			},
		},
		{
			name: "LangChainGenerations_Langsmith",
			raw:  `{"generations":[[{"text":"Observability is Y.","generation_info":{"finish_reason":"stop","logprobs":null},"type":"ChatGeneration","message":{"lc":1,"type":"constructor","id":["langchain","schema","messages","AIMessage"],"kwargs":{"content":"Observability is Y.","type":"ai","tool_calls":[],"invalid_tool_calls":[]}}}]],"llm_output":{"model_name":"gpt-4o-mini"}}`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeText, Content: "Observability is Y."}}, FinishReason: FinishReasonStop}},
		},
		{
			name: "SemconvTextPartWithTextKey_Litellm",
			raw:  `[{"role": "user", "parts": [{"type": "text", "text": "What animal is in this image?"}, {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,AAAA"}}]}]`,
			want: []Message{{Role: MessageRoleUser, Content: []Part{
				{Type: PartTypeText, Content: "What animal is in this image?"},
				{Type: PartTypeGeneric, Content: `{"image_url":{"url":"data:image/jpeg;base64,AAAA"},"type":"image_url"}`},
			}}},
		},
		{
			name: "CompletionObject_OpenrouterGateway",
			raw:  `{"completion":"Paris.","reasoning":"The user asks for a capital.","rawRequest":{"model":"openai/gpt-4o-mini"}}`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{
				{Type: PartTypeThinking, Content: "The user asks for a capital."},
				{Type: PartTypeText, Content: "Paris."},
			}}},
		},
		{
			name: "VercelPrompt_SystemAndPrompt",
			raw:  `{"system":"You are concise.","prompt":"Say hello in five words."}`,
			want: []Message{text(MessageRoleSystem, "You are concise."), text(MessageRoleUser, "Say hello in five words.")},
		},
		{
			name: "VercelResponseToolCalls_BareList",
			raw:  `[{"toolCallType":"function","toolCallId":"call_1","toolName":"getWeather","args":"{\"city\":\"Bengaluru\"}"},{"type":"tool-call","toolCallId":"call_2","toolName":"searchWeb","input":{"q":"SigNoz"}}]`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{
				{Type: PartTypeToolCall, ID: "call_1", Name: "getWeather", Arguments: map[string]any{"city": "Bengaluru"}},
				{Type: PartTypeToolCall, ID: "call_2", Name: "searchWeb", Arguments: map[string]any{"q": "SigNoz"}},
			}}},
		},
		{
			name: "LangChainTypeMessages_AdditionalKwargsToolCalls",
			raw:  `[{"type":"human","content":"Weather?"},{"type":"ai","content":"","additional_kwargs":{"tool_calls":[{"id":"call_1","type":"function","function":{"name":"get_weather","arguments":"{\"city\":\"Paris\"}"}}]}},{"type":"tool","content":"20C","tool_call_id":"call_1","name":"get_weather"}]`,
			want: []Message{
				text(MessageRoleUser, "Weather?"),
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "call_1", Name: "get_weather", Arguments: map[string]any{"city": "Paris"}}}},
				{Role: MessageRoleTool, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "call_1", Name: "get_weather", Content: "20C"}}},
			},
		},
		{
			name: "LangGraphToolDefinitionMessage_Skipped",
			raw:  `[{"role":"tool","content":{"type":"function","function":{"name":"get_weather","parameters":{}}}},{"role":"user","content":"Hi"}]`,
			want: []Message{text(MessageRoleUser, "Hi")},
		},
		{
			name: "GeminiResponse_CandidatesWithFinishReason",
			raw:  `{"candidates":[{"content":{"parts":[{"text":"Let me check","thought":true},{"function_call":{"name":"get_weather","args":{"city":"Paris"}}}],"role":"model"},"finishReason":"STOP"}],"usageMetadata":{}}`,
			want: []Message{{Role: MessageRoleAssistant, FinishReason: FinishReasonStop, Content: []Part{
				{Type: PartTypeThinking, Content: "Let me check"},
				{Type: PartTypeToolCall, Name: "get_weather", Arguments: map[string]any{"city": "Paris"}},
			}}},
		},
		{
			name: "GeminiRequest_ContentsWithSystemInstruction",
			raw:  `{"model":"gemini-2.0","config":{"system_instruction":"Be brief."},"contents":[{"role":"user","parts":[{"text":"Hi"}]},{"role":"user","parts":[{"function_response":{"name":"get_weather","response":{"temp":20}}}]}]}`,
			want: []Message{
				text(MessageRoleSystem, "Be brief."),
				text(MessageRoleUser, "Hi"),
				{Role: MessageRoleUser, Content: []Part{{Type: PartTypeToolResult, Name: "get_weather", Content: `{"temp":20}`}}},
			},
		},
		{
			name: "GeminiRequest_StringContents",
			raw:  `{"contents":"Hi there","model":"gemini-2.0"}`,
			want: []Message{text(MessageRoleUser, "Hi there")},
		},
		{
			name: "MicrosoftAgent_ArrayToolCallIDs",
			raw:  `[{"role":"assistant","parts":[{"type":"tool_call","id":["run_1","call_9"],"name":"lookup","arguments":{"q":"x"}}]},{"role":"tool","parts":[{"type":"tool_call_response","id":["run_1","call_9"],"response":"found"}]}]`,
			want: []Message{
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "call_9", Name: "lookup", Arguments: map[string]any{"q": "x"}}}},
				{Role: MessageRoleTool, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "call_9", Content: "found"}}},
			},
		},
		{
			name: "PydanticAI_ToolCallResponseResultKey",
			raw:  `[{"role":"user","parts":[{"type":"tool_call_response","id":"call_1","name":"lookup","result":{"ok":true}}]}]`,
			want: []Message{{Role: MessageRoleUser, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "call_1", Name: "lookup", Content: `{"ok":true}`}}}},
		},
		{
			name: "SemanticKernel_EventContentWrapper",
			raw:  `[{"role":"system","gen_ai.event.content":"{\"role\":\"system\",\"content\":\"Be brief.\",\"tool_calls\":[]}","gen_ai.system":"openai"},{"gen_ai.event.content":"{\"index\":0,\"message\":{\"role\":\"Assistant\",\"content\":\"Paris.\"},\"finish_reason\":\"Stop\"}"}]`,
			want: []Message{
				text(MessageRoleSystem, "Be brief."),
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeText, Content: "Paris."}}, FinishReason: FinishReasonStop},
			},
		},
		{
			name: "BedrockConverse_ToolUseAndToolResult",
			raw:  `{"messages":[{"role":"user","content":[{"text":"Weather?"}]},{"role":"assistant","content":[{"toolUse":{"toolUseId":"t1","name":"get_weather","input":{"city":"Paris"}}}]},{"role":"user","content":[{"toolResult":{"toolUseId":"t1","content":[{"text":"20C"}],"status":"error"}}]}],"system":[{"text":"Be brief."}]}`,
			want: []Message{
				text(MessageRoleSystem, "Be brief."),
				text(MessageRoleUser, "Weather?"),
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "t1", Name: "get_weather", Arguments: map[string]any{"city": "Paris"}}}},
				{Role: MessageRoleUser, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "t1", Content: "20C", IsError: true}}},
			},
		},
		{
			name: "AnthropicRequest_SystemString",
			raw:  `{"model":"claude","system":"Be brief.","messages":[{"role":"user","content":"Hi"}],"max_tokens":100}`,
			want: []Message{text(MessageRoleSystem, "Be brief."), text(MessageRoleUser, "Hi")},
		},
		{
			name: "OpenAIResponses_BuiltInToolCallIsServer",
			raw:  `{"object":"response","status":"completed","output":[{"type":"web_search_call","id":"ws_1","status":"completed","action":{"type":"search","query":"SigNoz"}},{"type":"custom_tool_call","call_id":"c1","name":"grep","input":"foo"},{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Found it."}]}]}`,
			want: []Message{
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "ws_1", Name: "web_search_call", Arguments: map[string]any{"action": map[string]any{"type": "search", "query": "SigNoz"}}, Server: true}}},
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "c1", Name: "grep", Arguments: "foo"}}},
				{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeText, Content: "Found it."}}, FinishReason: FinishReasonStop},
			},
		},
		{
			name: "NestedMessageList_Unwrapped",
			raw:  `[[{"role":"user","content":"Hi"}]]`,
			want: []Message{text(MessageRoleUser, "Hi")},
		},
		{
			name: "StringifiedMessages_Decoded",
			raw:  `{"messages":"[{\"role\":\"user\",\"content\":\"Hi\"}]"}`,
			want: []Message{text(MessageRoleUser, "Hi")},
		},
		{
			name: "EmbeddingsRequest_Generic",
			raw:  `{"input": ["a", "b"], "model": "text-embedding-3-small"}`,
			want: []Message{{Content: []Part{{Type: PartTypeGeneric, Content: `{"input": ["a", "b"], "model": "text-embedding-3-small"}`}}}},
		},
		{
			name: "BedrockConverseResponse_OutputMessageWrapper",
			raw:  `{"output":{"message":{"role":"assistant","content":[{"text":"20C in Paris."}]}},"stopReason":"end_turn","usage":{"inputTokens":10}}`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeText, Content: "20C in Paris."}}, FinishReason: FinishReasonStop}},
		},
		{
			name: "OllamaResponse_MessageWrapper",
			raw:  `{"model":"llama3","message":{"role":"assistant","content":"Hi!"},"done":true,"done_reason":"stop"}`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeText, Content: "Hi!"}}, FinishReason: FinishReasonStop}},
		},
		{
			name: "CohereV2Response_MessageWrapper",
			raw:  `{"id":"x","message":{"role":"assistant","tool_calls":[{"id":"c1","type":"function","function":{"name":"get_weather","arguments":"{\"city\":\"Paris\"}"}}]},"finish_reason":"TOOL_CALL"}`,
			want: []Message{{Role: MessageRoleAssistant, FinishReason: FinishReasonToolCall, Content: []Part{{Type: PartTypeToolCall, ID: "c1", Name: "get_weather", Arguments: map[string]any{"city": "Paris"}}}}},
		},
		{
			name: "OpenAIToolMessage_TextBlocksBecomeToolResult",
			raw:  `[{"role":"tool","tool_call_id":"c1","content":[{"type":"text","text":"20C"},{"type":"text","text":"clear"}]}]`,
			want: []Message{{Role: MessageRoleTool, Content: []Part{
				{Type: PartTypeToolResult, ToolCallID: "c1", Content: "20C"},
				{Type: PartTypeToolResult, ToolCallID: "c1", Content: "clear"},
			}}},
		},
		{
			name: "AnthropicToolResult_TextBlocksJoined",
			raw:  `[{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":[{"type":"text","text":"line one"},{"type":"text","text":"line two"}]}]}]`,
			want: []Message{{Role: MessageRoleUser, Content: []Part{{Type: PartTypeToolResult, ToolCallID: "t1", Content: "line one\nline two"}}}},
		},
		{
			name: "MessageWithContentParts_GeminiNested",
			raw:  `[{"role":"model","content":{"parts":[{"text":"Hi"}],"role":"model"}}]`,
			want: []Message{text(MessageRoleAssistant, "Hi")},
		},
		{
			name: "ToolCallTypedItem_PlainToolCall",
			raw:  `[{"type":"tool_call","id":"c1","name":"get_weather","args":{"city":"Paris"}}]`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "c1", Name: "get_weather", Arguments: map[string]any{"city": "Paris"}}}}},
		},
		{
			name: "OpenAIToolCallList_Bare",
			raw:  `[{"id":"c1","type":"function","function":{"name":"get_weather","arguments":"{\"city\":\"Paris\"}"}}]`,
			want: []Message{{Role: MessageRoleAssistant, Content: []Part{{Type: PartTypeToolCall, ID: "c1", Name: "get_weather", Arguments: map[string]any{"city": "Paris"}}}}},
		},
		{
			name: "ToolDefinitionList_Generic",
			raw:  `[{"type":"function","function":{"name":"get_weather","description":"Weather","parameters":{"type":"object"}}}]`,
			want: []Message{{Content: []Part{{Type: PartTypeGeneric, Content: `[{"type":"function","function":{"name":"get_weather","description":"Weather","parameters":{"type":"object"}}}]`}}}},
		},
		{
			name: "ContentBlockList_RolelessMessage",
			raw:  `[{"type":"text","text":"Let me check."},{"type":"tool_use","id":"t1","name":"lookup","input":{"q":"x"}}]`,
			want: []Message{{Content: []Part{
				{Type: PartTypeText, Content: "Let me check."},
				{Type: PartTypeToolCall, ID: "t1", Name: "lookup", Arguments: map[string]any{"q": "x"}},
			}}},
		},
		{
			name: "ListOfJSONStrings_Decoded",
			raw:  []any{`{"role":"user","content":"Hi"}`, `{"role":"assistant","content":"Hello"}`},
			want: []Message{text(MessageRoleUser, "Hi"), text(MessageRoleAssistant, "Hello")},
		},
		{
			name: "SingleMessageObject_Converted",
			raw:  `{"role":"assistant","content":"Done."}`,
			want: []Message{text(MessageRoleAssistant, "Done.")},
		},
		{
			name: "UnknownRoleAndFinishReason_KeptLowercased",
			raw:  `[{"role":"Narrator","parts":[{"type":"text","content":"x"}],"finish_reason":"Weird"}]`,
			want: []Message{{Role: "narrator", Content: []Part{{Type: PartTypeText, Content: "x"}}, FinishReason: "weird"}},
		},
		{
			name: "UnknownPartType_Generic",
			raw:  `[{"role":"user","parts":[{"type":"image","url":"http://x/y.png"}]}]`,
			want: []Message{{Role: MessageRoleUser, Content: []Part{{Type: PartTypeGeneric, Content: `{"type":"image","url":"http://x/y.png"}`}}}},
		},
		{
			name: "PlainText_Generic",
			raw:  "Let the cost of the ball be x dollars.",
			want: []Message{{Content: []Part{{Type: PartTypeGeneric, Content: "Let the cost of the ball be x dollars."}}}},
		},
		{
			name: "UnknownJSONShape_GenericWithOriginal",
			raw:  `{"output": "{\"query\": \"SigNoz\"}", "kwargs": {"name": "search_web"}}`,
			want: []Message{{Content: []Part{{Type: PartTypeGeneric, Content: `{"output": "{\"query\": \"SigNoz\"}", "kwargs": {"name": "search_web"}}`}}}},
		},
		{
			name: "JSONEncodedString_Generic",
			raw:  `"{\"query\": \"SigNoz\"}"`,
			want: []Message{{Content: []Part{{Type: PartTypeGeneric, Content: `"{\"query\": \"SigNoz\"}"`}}}},
		},
		{
			name: "DecodedValue_Converted",
			raw:  []any{map[string]any{"role": "user", "content": "hi"}},
			want: []Message{text(MessageRoleUser, "hi")},
		},
		{
			name: "EmptyList_NoMessages",
			raw:  `[]`,
			want: []Message{},
		},
		{
			name: "Nil_NoMessages",
			raw:  nil,
			want: []Message{},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, NormalizeMessages(testCase.raw))
		})
	}
}
