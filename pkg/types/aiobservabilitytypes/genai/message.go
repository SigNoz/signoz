// Package genai mirrors the OpenTelemetry GenAI message schemas, one type per schema definition:
// open-telemetry/semantic-conventions-genai@06ec68e, model/gen-ai/gen-ai-{input,output}-messages.json.
// Keys the schema does not name are dropped; the raw attribute on the span still has them.
package genai

const (
	RoleSystem    Role = "system"
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
	RoleTool      Role = "tool"
)

const (
	FinishReasonStop          FinishReason = "stop"
	FinishReasonLength        FinishReason = "length"
	FinishReasonContentFilter FinishReason = "content_filter"
	FinishReasonToolCall      FinishReason = "tool_call"
	FinishReasonCompaction    FinishReason = "compaction"
	FinishReasonError         FinishReason = "error"
)

const (
	ModalityImage    Modality = "image"
	ModalityVideo    Modality = "video"
	ModalityAudio    Modality = "audio"
	ModalityDocument Modality = "document"
)

// Role, FinishReason and Modality are open enums: the constants are the values the schema
// names, any other string is kept as sent.
type Role string

type FinishReason string

type Modality string

type InputMessages []ChatMessage

// OutputMessages holds one message per choice.
type OutputMessages []OutputMessage

type ChatMessage struct {
	Role  Role    `json:"role" required:"true"`
	Parts Parts   `json:"parts" required:"true" nullable:"false"`
	Name  *string `json:"name,omitempty"`
}

// OutputMessage is one choice. The schema deprecates FinishReason in favour of
// gen_ai.response.finish_reasons; it stays so each choice carries its own.
type OutputMessage struct {
	Role         Role          `json:"role" required:"true"`
	Parts        Parts         `json:"parts" required:"true" nullable:"false"`
	Name         *string       `json:"name,omitempty"`
	FinishReason *FinishReason `json:"finish_reason,omitempty"`
}
