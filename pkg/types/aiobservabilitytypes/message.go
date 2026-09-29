package aiobservabilitytypes

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
