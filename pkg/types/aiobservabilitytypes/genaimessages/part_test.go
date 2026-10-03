package genaimessages

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

func TestNormalizePartContent(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "PartWithUnknownType_BecomesGeneric",
			raw:  `[{"role":"user","parts":[{"type":"image","url":"http://x/y.png"}]}]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeGeneric, Content: `{"type":"image","url":"http://x/y.png"}`},
					},
				},
			},
		},
	})
}

func TestNormalizePartThinking(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "ThoughtReasoningAndHiddenParts_BecomeThinking",
			raw: `[
				{
					"role": "assistant",
					"parts": [
						{"type": "text", "content": "Let me think", "thought": true},
						{"type": "reasoning", "content": "step 1"},
						{"type": "redacted_reasoning", "data": "xyz"},
						{"type": "text", "content": "Answer"}
					]
				}
			]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeThinking, Content: "Let me think"},
						{Type: aiobservabilitytypes.PartTypeThinking, Content: "step 1"},
						{Type: aiobservabilitytypes.PartTypeThinking},
						{Type: aiobservabilitytypes.PartTypeText, Content: "Answer"},
					},
				},
			},
		},
	})
}

func TestNormalizePartTools(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "AnthropicServerToolUseAndWebSearchResult_BecomeToolCallAndResult",
			raw: `[
				{
					"role": "assistant",
					"content": [
						{"type": "server_tool_use", "id": "srvtoolu_1", "name": "web_search", "input": {"query": "SigNoz"}},
						{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_1", "content": [{"type": "web_search_result", "title": "SigNoz", "url": "https://signoz.io"}]}
					]
				}
			]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolCall, ID: "srvtoolu_1", Name: "web_search", Arguments: map[string]any{"query": "SigNoz"}},
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "srvtoolu_1", Content: `[{"title":"SigNoz","type":"web_search_result","url":"https://signoz.io"}]`},
					},
				},
			},
		},
		{
			name: "AnthropicToolResultTextBlocks_JoinedIntoOneString",
			raw: `[
				{
					"role": "user",
					"content": [
						{
							"type": "tool_result",
							"tool_use_id": "t1",
							"content": [
								{"type": "text", "text": "line one"},
								{"type": "text", "text": "line two"}
							]
						}
					]
				}
			]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "t1", Content: "line one\nline two"},
					},
				},
			},
		},
		{
			name: "VercelToolResultJSONWrapper_ValueUnwrapped",
			raw:  `[{"role": "tool", "content": [{"type": "tool-result", "toolCallId": "call_1", "toolName": "get_weather", "result": {"type": "json", "value": {"temp_c": 18}}}]}]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleTool,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: "call_1", Name: "get_weather", Content: `{"temp_c":18}`},
					},
				},
			},
		},
		{
			name: "ToolCallWithInvalidJSONArguments_ArgumentsKeptAsString",
			raw:  `[{"role": "assistant", "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "get_weather", "arguments": "{city: Paris"}}]}]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolCall, ID: "call_1", Name: "get_weather", Arguments: "{city: Paris"},
					},
				},
			},
		},
	})
}
