// Package genai mirrors the OpenTelemetry GenAI message schemas, one type per schema definition:
// open-telemetry/semantic-conventions-genai@06ec68e, model/gen-ai/gen-ai-{input,output}-messages.json.
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

// InputMessages is the gen_ai.input.messages value.
type InputMessages []ChatMessage

// OutputMessages is the gen_ai.output.messages value, one message per choice.
type OutputMessages []OutputMessage

type ChatMessage struct {
	Role  Role    `json:"role" required:"true"`
	Parts Parts   `json:"parts" required:"true" nullable:"false"`
	Name  *string `json:"name,omitempty"`
	// AdditionalProperties carries keys the schema does not name; it allows them.
	AdditionalProperties map[string]any `json:"-"`
}

// OutputMessage is one choice. The schema deprecates FinishReason in favour of
// gen_ai.response.finish_reasons; it stays so each choice carries its own.
type OutputMessage struct {
	Role                 Role           `json:"role" required:"true"`
	Parts                Parts          `json:"parts" required:"true" nullable:"false"`
	Name                 *string        `json:"name,omitempty"`
	FinishReason         *FinishReason  `json:"finish_reason,omitempty"`
	AdditionalProperties map[string]any `json:"-"`
}

func (m ChatMessage) MarshalJSON() ([]byte, error) {
	type plain ChatMessage
	p := plain(m)
	if p.Parts == nil {
		p.Parts = Parts{}
	}
	return marshalWithExtras(p, m.AdditionalProperties)
}

func (m *ChatMessage) UnmarshalJSON(data []byte) error {
	type plain ChatMessage
	var p plain
	extras, err := unmarshalWithExtras(data, &p)
	if err != nil {
		return err
	}
	*m = ChatMessage(p)
	m.AdditionalProperties = extras
	return nil
}

func (m OutputMessage) MarshalJSON() ([]byte, error) {
	type plain OutputMessage
	p := plain(m)
	if p.Parts == nil {
		p.Parts = Parts{}
	}
	return marshalWithExtras(p, m.AdditionalProperties)
}

func (m *OutputMessage) UnmarshalJSON(data []byte) error {
	type plain OutputMessage
	var p plain
	extras, err := unmarshalWithExtras(data, &p)
	if err != nil {
		return err
	}
	*m = OutputMessage(p)
	m.AdditionalProperties = extras
	return nil
}
