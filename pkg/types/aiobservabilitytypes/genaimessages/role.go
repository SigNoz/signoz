package genaimessages

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// normalizeRole keeps an unknown role, lowercased.
func normalizeRole(role string) aiobservabilitytypes.MessageRole {
	if known := standardRole(role); known != "" {
		return known
	}
	return aiobservabilitytypes.MessageRole(strings.ToLower(strings.TrimSpace(role)))
}

// normalizeFinishReason keeps an unknown reason, lowercased.
func normalizeFinishReason(reason string) aiobservabilitytypes.FinishReason {
	lowered := strings.ToLower(strings.TrimSpace(reason))
	switch lowered {
	case "stop", "end_turn", "stop_sequence", "completed", "complete", "eos", "finished":
		return aiobservabilitytypes.FinishReasonStop
	case "tool_call", "tool_calls", "tool_use", "function_call":
		return aiobservabilitytypes.FinishReasonToolCall
	case "length", "max_tokens", "max_output_tokens", "max_completion_tokens", "model_length":
		return aiobservabilitytypes.FinishReasonLength
	case "content_filter", "content_filtered", "guardrail_intervened", "safety", "refusal", "recitation", "blocklist", "prohibited_content", "spii":
		return aiobservabilitytypes.FinishReasonContentFilter
	case "error", "failed", "incomplete":
		return aiobservabilitytypes.FinishReasonError
	}
	return aiobservabilitytypes.FinishReason(lowered)
}

// standardRole maps vendor role names onto MessageRole; anything else is "".
func standardRole(role string) aiobservabilitytypes.MessageRole {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "system", "developer":
		return aiobservabilitytypes.MessageRoleSystem
	case "user", "human":
		return aiobservabilitytypes.MessageRoleUser
	case "assistant", "ai", "model":
		return aiobservabilitytypes.MessageRoleAssistant
	case "tool", "function":
		return aiobservabilitytypes.MessageRoleTool
	}
	return ""
}
