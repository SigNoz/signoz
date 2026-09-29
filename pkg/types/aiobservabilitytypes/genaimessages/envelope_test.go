package genaimessages

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

func TestNormalizeEnvelopeRequests(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "AnthropicRequest_SystemStringBecomesSystemMessage",
			raw: `{
				"model": "claude",
				"system": "Be brief.",
				"messages": [{"role": "user", "content": "Hi"}],
				"max_tokens": 100
			}`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleSystem,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Be brief."},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hi"},
					},
				},
			},
		},
		{
			name: "GeminiRequest_ConfigSystemInstructionBecomesSystemMessage",
			raw: `{
				"model": "gemini-2.0",
				"config": {"system_instruction": "Be brief."},
				"contents": [
					{"role": "user", "parts": [{"text": "Hi"}]},
					{
						"role": "user",
						"parts": [
							{
								"function_response": {"name": "get_weather", "response": {"temp": 20}}
							}
						]
					}
				]
			}`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleSystem,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Be brief."},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hi"},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeToolResult, Name: "get_weather", Content: `{"temp":20}`},
					},
				},
			},
		},
		{
			name: "GeminiRequest_SystemInstructionPartsBecomeSystemMessage",
			raw:  `{"system_instruction": {"parts": [{"text": "Be brief."}]}, "contents": [{"role": "user", "parts": [{"text": "Hi"}]}]}`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleSystem,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Be brief."},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hi"},
					},
				},
			},
		},
		{
			name: "RequestWithMessagesAsJSONString_MessagesDecoded",
			raw:  `{"messages":"[{\"role\":\"user\",\"content\":\"Hi\"}]"}`,
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

func TestNormalizeEnvelopeChatResponses(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "StreamingChunkDelta_BecomesAssistantText",
			raw:  `{"choices": [{"delta": {"role": "assistant", "content": "Hel"}, "finish_reason": null}]}`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hel"},
					},
				},
			},
		},
		{
			name: "LegacyCompletionChoiceText_BecomesAssistantTextWithLength",
			raw:  `{"choices": [{"text": "Hello", "finish_reason": "length"}]}`,
			want: []aiobservabilitytypes.Message{
				{
					Role:         aiobservabilitytypes.MessageRoleAssistant,
					FinishReason: aiobservabilitytypes.FinishReasonLength,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hello"},
					},
				},
			},
		},
		{
			name: "FilteredChoiceWithoutMessage_BecomesGenericWithContentFilter",
			raw:  `{"choices": [{"index": 0, "finish_reason": "content_filter"}]}`,
			want: []aiobservabilitytypes.Message{
				{
					Role:         aiobservabilitytypes.MessageRoleAssistant,
					FinishReason: aiobservabilitytypes.FinishReasonContentFilter,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeGeneric, Content: `{"finish_reason":"content_filter","index":0}`},
					},
				},
			},
		},
	})
}

func TestNormalizeEnvelopeOpenAIResponses(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "ResponsesAPIResponse_MessageAndReasoningItemsConverted",
			raw: `{
				"object": "response",
				"status": "completed",
				"output": [
					{
						"type": "reasoning",
						"id": "rs_1",
						"summary": [{"type": "summary_text", "text": "Thinking about it"}]
					},
					{
						"type": "message",
						"role": "assistant",
						"content": [{"type": "output_text", "text": "Paris."}]
					}
				]
			}`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeThinking, Content: "Thinking about it"},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Paris."},
					},
					FinishReason: aiobservabilitytypes.FinishReasonStop,
				},
			},
		},
		{
			name: "ResponsesAPIResponseIncomplete_EncryptedReasoningEmptyAndFinishReasonLength",
			raw: `{
				"output": [
					{"type": "reasoning", "content": [{"type": "reasoning_text", "text": "step 1"}]},
					{"type": "reasoning", "encrypted_content": "gAAAA"}
				],
				"status": "incomplete",
				"incomplete_details": {"reason": "max_output_tokens"}
			}`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeThinking, Content: "step 1"},
					},
				},
				{
					Role:         aiobservabilitytypes.MessageRoleAssistant,
					FinishReason: aiobservabilitytypes.FinishReasonLength,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeThinking},
					},
				},
			},
		},
	})
}

func TestNormalizeEnvelopeGemini(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "GeminiResponse_ThoughtAndFunctionCallPartsConverted",
			raw: `{
				"candidates": [
					{
						"content": {
							"parts": [
								{"text": "Let me check", "thought": true},
								{"function_call": {"name": "get_weather", "args": {"city": "Paris"}}}
							],
							"role": "model"
						},
						"finishReason": "STOP"
					}
				],
				"usageMetadata": {}
			}`,
			want: []aiobservabilitytypes.Message{
				{
					Role:         aiobservabilitytypes.MessageRoleAssistant,
					FinishReason: aiobservabilitytypes.FinishReasonStop,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeThinking, Content: "Let me check"},
						{Type: aiobservabilitytypes.PartTypeToolCall, Name: "get_weather", Arguments: map[string]any{"city": "Paris"}},
					},
				},
			},
		},
		{
			name: "GoogleADKResponse_ContentBecomesAssistantMessageWithStop",
			raw:  `{"content": {"parts": [{"text": "It is 18°C and clear in Bengaluru."}], "role": "model"}, "finish_reason": "STOP"}`,
			want: []aiobservabilitytypes.Message{
				{
					Role:         aiobservabilitytypes.MessageRoleAssistant,
					FinishReason: aiobservabilitytypes.FinishReasonStop,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "It is 18°C and clear in Bengaluru."},
					},
				},
			},
		},
		{
			name: "GeminiResponseBlockedBySafety_BecomesGenericWithContentFilter",
			raw:  `{"candidates": [{"finishReason": "SAFETY", "index": 0}]}`,
			want: []aiobservabilitytypes.Message{
				{
					Role:         aiobservabilitytypes.MessageRoleAssistant,
					FinishReason: aiobservabilitytypes.FinishReasonContentFilter,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeGeneric, Content: `{"finishReason":"SAFETY","index":0}`},
					},
				},
			},
		},
	})
}

func TestNormalizeEnvelopeLangChain(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "LangChainGenerationWithOnlyText_BecomesAssistantTextWithLength",
			raw:  `{"generations": [[{"text": "Observability is the ability", "generation_info": {"finish_reason": "length"}}]]}`,
			want: []aiobservabilitytypes.Message{
				{
					Role:         aiobservabilitytypes.MessageRoleAssistant,
					FinishReason: aiobservabilitytypes.FinishReasonLength,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Observability is the ability"},
					},
				},
			},
		},
	})
}
