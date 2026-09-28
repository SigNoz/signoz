package aiobservabilitytypes

import "strings"

const (
	MessageRoleSystem    MessageRole = "system"
	MessageRoleUser      MessageRole = "user"
	MessageRoleAssistant MessageRole = "assistant"
	MessageRoleTool      MessageRole = "tool"
)

const (
	FinishReasonStop          FinishReason = "stop"
	FinishReasonToolCall      FinishReason = "tool_call"
	FinishReasonLength        FinishReason = "length"
	FinishReasonContentFilter FinishReason = "content_filter"
	FinishReasonError         FinishReason = "error"
)

const (
	PartTypeText       PartType = "text"
	PartTypeThinking   PartType = "thinking"
	PartTypeToolCall   PartType = "tool_call"
	PartTypeToolResult PartType = "tool_result"
	PartTypeGeneric    PartType = "generic"
)

type MessageRole string

type FinishReason string

type PartType string

// Part is one piece of a message. Which fields are set depends on Type:
//
//	text        Content
//	thinking    Content, Redacted
//	tool_call   ID, Name, Arguments, Server
//	tool_result ToolCallID, Name, Content, IsError, Server
//	generic     Content (the original value, always a string)
type Part struct {
	Type       PartType `json:"type" required:"true"`
	Content    string   `json:"content,omitempty"`
	Redacted   bool     `json:"redacted,omitempty"`
	ID         string   `json:"id,omitempty"`
	Name       string   `json:"name,omitempty"`
	Arguments  any      `json:"arguments,omitempty"`
	Server     bool     `json:"server,omitempty"`
	ToolCallID string   `json:"toolCallId,omitempty"`
	IsError    bool     `json:"isError,omitempty"`
}

type Message struct {
	Role         MessageRole  `json:"role,omitempty"`
	Content      []Part       `json:"content" required:"true" nullable:"false"`
	FinishReason FinishReason `json:"finishReason,omitempty"`
}

func (PartType) Enum() []any {
	return []any{PartTypeText, PartTypeThinking, PartTypeToolCall, PartTypeToolResult, PartTypeGeneric}
}

// normalizeRole keeps an unknown role, lowercased.
func normalizeRole(role string) MessageRole {
	if known := knownRole(role); known != "" {
		return known
	}
	return MessageRole(strings.ToLower(strings.TrimSpace(role)))
}

// normalizeFinishReason keeps an unknown reason, lowercased.
func normalizeFinishReason(reason string) FinishReason {
	lowered := strings.ToLower(strings.TrimSpace(reason))
	switch lowered {
	case "stop", "end_turn", "stop_sequence", "completed", "complete", "eos", "finished":
		return FinishReasonStop
	case "tool_call", "tool_calls", "tool_use", "function_call":
		return FinishReasonToolCall
	case "length", "max_tokens", "max_output_tokens", "max_completion_tokens", "model_length":
		return FinishReasonLength
	case "content_filter", "content_filtered", "guardrail_intervened", "safety", "refusal", "recitation", "blocklist", "prohibited_content", "spii":
		return FinishReasonContentFilter
	case "error", "failed", "incomplete":
		return FinishReasonError
	}
	return FinishReason(lowered)
}

// knownRole maps vendor role names onto MessageRole; anything else is "".
func knownRole(role string) MessageRole {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "system", "developer":
		return MessageRoleSystem
	case "user", "human":
		return MessageRoleUser
	case "assistant", "ai", "model":
		return MessageRoleAssistant
	case "tool", "function":
		return MessageRoleTool
	}
	return ""
}
