// Package genai mirrors the OpenTelemetry GenAI message schemas, one type per schema definition:
// open-telemetry/semantic-conventions-genai@06ec68e, model/gen-ai/gen-ai-{input,output}-messages.json.
// Keys the schema does not name are dropped; the raw attribute on the span still has them.
package genai

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	RoleSystem    = Role{valuer.NewString("system")}
	RoleUser      = Role{valuer.NewString("user")}
	RoleAssistant = Role{valuer.NewString("assistant")}
	RoleTool      = Role{valuer.NewString("tool")}
)

var (
	FinishReasonStop          = FinishReason{valuer.NewString("stop")}
	FinishReasonLength        = FinishReason{valuer.NewString("length")}
	FinishReasonContentFilter = FinishReason{valuer.NewString("content_filter")}
	FinishReasonToolCall      = FinishReason{valuer.NewString("tool_call")}
	FinishReasonCompaction    = FinishReason{valuer.NewString("compaction")}
	FinishReasonError         = FinishReason{valuer.NewString("error")}
)

var (
	ModalityImage    = Modality{valuer.NewString("image")}
	ModalityVideo    = Modality{valuer.NewString("video")}
	ModalityAudio    = Modality{valuer.NewString("audio")}
	ModalityDocument = Modality{valuer.NewString("document")}
)

// Role, FinishReason and Modality are open enums: the variables are the values the schema
// names, any other string is kept as sent, so none of them lists an Enum for the spec.
type Role struct{ valuer.String }

type FinishReason struct{ valuer.String }

type Modality struct{ valuer.String }

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
