package genaimessages

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/stretchr/testify/assert"
)

func TestNormalizeRole(t *testing.T) {
	testCases := []struct {
		name  string
		roles []string
		want  aiobservabilitytypes.MessageRole
	}{
		{name: "SystemAndDeveloper_MapToSystem", roles: []string{"system", "developer", " Developer "}, want: aiobservabilitytypes.MessageRoleSystem},
		{name: "UserAndHuman_MapToUser", roles: []string{"user", "human", "HUMAN"}, want: aiobservabilitytypes.MessageRoleUser},
		{name: "AssistantAIAndModel_MapToAssistant", roles: []string{"assistant", "ai", "model"}, want: aiobservabilitytypes.MessageRoleAssistant},
		{name: "ToolAndFunction_MapToTool", roles: []string{"tool", "function"}, want: aiobservabilitytypes.MessageRoleTool},
		{name: "UnknownRole_KeptLowercased", roles: []string{"Narrator"}, want: "narrator"},
		{name: "EmptyRole_StaysEmpty", roles: []string{"", "  "}, want: ""},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			for _, role := range testCase.roles {
				assert.Equal(t, testCase.want, normalizeRole(role), role)
			}
		})
	}
}

func TestNormalizeFinishReason(t *testing.T) {
	testCases := []struct {
		name    string
		reasons []string
		want    aiobservabilitytypes.FinishReason
	}{
		{name: "EndOfAnswer_MapsToStop", reasons: []string{"stop", "end_turn", "stop_sequence", "completed", "complete", "eos", "finished", "STOP"}, want: aiobservabilitytypes.FinishReasonStop},
		{name: "ToolCallVariants_MapToToolCall", reasons: []string{"tool_call", "tool_calls", "tool_use", "function_call"}, want: aiobservabilitytypes.FinishReasonToolCall},
		{name: "TokenLimits_MapToLength", reasons: []string{"length", "max_tokens", "max_output_tokens", "max_completion_tokens", "model_length", "MAX_TOKENS"}, want: aiobservabilitytypes.FinishReasonLength},
		{name: "SafetyBlocks_MapToContentFilter", reasons: []string{"content_filter", "content_filtered", "guardrail_intervened", "safety", "refusal", "recitation", "blocklist", "prohibited_content", "spii", "SAFETY"}, want: aiobservabilitytypes.FinishReasonContentFilter},
		{name: "Failures_MapToError", reasons: []string{"error", "failed", "incomplete"}, want: aiobservabilitytypes.FinishReasonError},
		{name: "UnknownReason_KeptLowercased", reasons: []string{"Weird"}, want: "weird"},
		{name: "EmptyReason_StaysEmpty", reasons: []string{"", " "}, want: ""},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			for _, reason := range testCase.reasons {
				assert.Equal(t, testCase.want, normalizeFinishReason(reason), reason)
			}
		})
	}
}
