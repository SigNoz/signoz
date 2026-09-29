package genaimessages

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

func TestNormalizeMessageChat(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "AnthropicMessages_ThinkingAndToolUseBlocksConverted",
			raw: `[
				{"role": "user", "content": "Hi"},
				{
					"role": "assistant",
					"content": [
						{"type": "thinking", "thinking": "Let me see"},
						{"type": "redacted_thinking", "data": "x"},
						{
							"type": "tool_use",
							"id": "toolu_1",
							"name": "lookup",
							"input": {"q": "a"}
						}
					],
					"stop_reason": "tool_use"
				},
				{
					"role": "user",
					"content": [
						{
							"type": "tool_result",
							"tool_use_id": "toolu_1",
							"content": "found",
							"is_error": true
						}
					]
				}
			]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hi"},
					},
				},
				{
					Role:         aiobservabilitytypes.MessageRoleAssistant,
					FinishReason: aiobservabilitytypes.FinishReasonToolCall,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeThinking, Content: "Let me see"},
						{Type: aiobservabilitytypes.PartTypeThinking},
						{Type: aiobservabilitytypes.PartTypeToolCall, ID: "toolu_1", Name: "lookup", Arguments: map[string]any{"q": "a"}},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "toolu_1", Content: "found", IsError: true},
					},
				},
			},
		},
		{
			name: "OpenAIToolMessageTextBlocks_BecomeToolResult",
			raw: `[
				{
					"role": "tool",
					"tool_call_id": "c1",
					"content": [{"type": "text", "text": "20C"}, {"type": "text", "text": "clear"}]
				}
			]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleTool,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "c1", Content: "20C"},
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "c1", Content: "clear"},
					},
				},
			},
		},
		{
			name: "OpenAIRefusal_BecomesAssistantText",
			raw:  `[{"role": "assistant", "content": null, "refusal": "I can't help with that."}]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "I can't help with that."},
					},
				},
			},
		},
		{
			name: "OpenAILegacyFunctionCall_BecomesToolCall",
			raw:  `[{"role": "assistant", "content": null, "function_call": {"name": "get_weather", "arguments": "{\"city\": \"Paris\"}"}}]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolCall, Name: "get_weather", Arguments: map[string]any{"city": "Paris"}},
					},
				},
			},
		},
	})
}

func TestNormalizeMessageLangChain(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "LangChainTypedMessages_ToolCallsReadFromAdditionalKwargs",
			raw: `[
				{"type": "human", "content": "Weather?"},
				{
					"type": "ai",
					"content": "",
					"additional_kwargs": {
						"tool_calls": [
							{
								"id": "call_1",
								"type": "function",
								"function": {"name": "get_weather", "arguments": "{\"city\":\"Paris\"}"}
							}
						]
					}
				},
				{
					"type": "tool",
					"content": "20C",
					"tool_call_id": "call_1",
					"name": "get_weather"
				}
			]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Weather?"},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolCall, ID: "call_1", Name: "get_weather", Arguments: map[string]any{"city": "Paris"}},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleTool,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "call_1", Name: "get_weather", Content: "20C"},
					},
				},
			},
		},
		{
			name: "LangGraphToolDefinitionMessage_IsDropped",
			raw: `[
				{
					"role": "tool",
					"content": {
						"type": "function",
						"function": {"name": "get_weather", "parameters": {}}
					}
				},
				{"role": "user", "content": "Hi"}
			]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hi"},
					},
				},
			},
		},
	})
}

func TestNormalizeMessageOpenAIResponsesItems(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "BuiltInToolCallItem_BecomesToolCall",
			raw: `{
				"object": "response",
				"status": "completed",
				"output": [
					{
						"type": "web_search_call",
						"id": "ws_1",
						"status": "completed",
						"action": {"type": "search", "query": "SigNoz"}
					},
					{
						"type": "custom_tool_call",
						"call_id": "c1",
						"name": "grep",
						"input": "foo"
					},
					{
						"type": "message",
						"role": "assistant",
						"content": [{"type": "output_text", "text": "Found it."}]
					}
				]
			}`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolCall, ID: "ws_1", Name: "web_search_call", Arguments: map[string]any{"action": map[string]any{"type": "search", "query": "SigNoz"}}},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolCall, ID: "c1", Name: "grep", Arguments: "foo"},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Found it."},
					},
					FinishReason: aiobservabilitytypes.FinishReasonStop,
				},
			},
		},
		{
			name: "BuiltInToolOutputItem_BecomesToolResult",
			raw:  `[{"type": "local_shell_call_output", "call_id": "call_2", "output": "ok"}]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleTool,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "call_2", Name: "local_shell_call", Content: "ok"},
					},
				},
			},
		},
		{
			name: "MCPCallItemWithOutput_BecomesToolCallAndToolResult",
			raw:  `[{"type": "mcp_call", "id": "mcp_1", "server_label": "deepwiki", "name": "ask_question", "arguments": "{\"q\": \"What is SigNoz?\"}", "output": "An observability platform."}]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolCall, ID: "mcp_1", Name: "ask_question", Arguments: map[string]any{"q": "What is SigNoz?"}},
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "mcp_1", Name: "ask_question", Content: "An observability platform."},
					},
				},
			},
		},
	})
}
