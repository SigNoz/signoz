package genai

import (
	"encoding/json"

	"github.com/swaggest/jsonschema-go"

	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	PartTypeText                   = PartType{valuer.NewString("text")}
	PartTypeToolCall               = PartType{valuer.NewString("tool_call")}
	PartTypeToolCallResponse       = PartType{valuer.NewString("tool_call_response")}
	PartTypeServerToolCall         = PartType{valuer.NewString("server_tool_call")}
	PartTypeServerToolCallResponse = PartType{valuer.NewString("server_tool_call_response")}
	PartTypeBlob                   = PartType{valuer.NewString("blob")}
	PartTypeFile                   = PartType{valuer.NewString("file")}
	PartTypeURI                    = PartType{valuer.NewString("uri")}
	PartTypeReasoning              = PartType{valuer.NewString("reasoning")}
	PartTypeCompaction             = PartType{valuer.NewString("compaction")}
)

var (
	_ jsonschema.OneOfExposer = Part{}
	_ jsonschema.Preparer     = Part{}
)

// partVariants are the part types the schema names; any other type decodes as GenericPart.
// schemaRef is the component in the generated OpenAPI spec, for the discriminator mapping.
var partVariants = []partVariant{
	{typ: PartTypeText, decode: decodePart[TextPart], schema: TextPart{}, schemaRef: "#/components/schemas/GenaiTextPart"},
	{typ: PartTypeToolCall, decode: decodePart[ToolCallRequestPart], schema: ToolCallRequestPart{}, schemaRef: "#/components/schemas/GenaiToolCallRequestPart"},
	{typ: PartTypeToolCallResponse, decode: decodePart[ToolCallResponsePart], schema: ToolCallResponsePart{}, schemaRef: "#/components/schemas/GenaiToolCallResponsePart"},
	{typ: PartTypeServerToolCall, decode: decodePart[ServerToolCallPart], schema: ServerToolCallPart{}, schemaRef: "#/components/schemas/GenaiServerToolCallPart"},
	{typ: PartTypeServerToolCallResponse, decode: decodePart[ServerToolCallResponsePart], schema: ServerToolCallResponsePart{}, schemaRef: "#/components/schemas/GenaiServerToolCallResponsePart"},
	{typ: PartTypeBlob, decode: decodePart[BlobPart], schema: BlobPart{}, schemaRef: "#/components/schemas/GenaiBlobPart"},
	{typ: PartTypeFile, decode: decodePart[FilePart], schema: FilePart{}, schemaRef: "#/components/schemas/GenaiFilePart"},
	{typ: PartTypeURI, decode: decodePart[UriPart], schema: UriPart{}, schemaRef: "#/components/schemas/GenaiUriPart"},
	{typ: PartTypeReasoning, decode: decodePart[ReasoningPart], schema: ReasoningPart{}, schemaRef: "#/components/schemas/GenaiReasoningPart"},
	{typ: PartTypeCompaction, decode: decodePart[CompactionPart], schema: CompactionPart{}, schemaRef: "#/components/schemas/GenaiCompactionPart"},
}

type PartType struct{ valuer.String }

// Part is one message part, the schema's anyOf discriminated on "type". Value holds the part
// struct for that type and is encoded as the part itself.
type Part struct {
	Value any `json:"-"`
}

type Parts []Part

type TextPart struct {
	Type    PartType `json:"type" required:"true"`
	Content string   `json:"content" required:"true"`
}

type ToolCallRequestPart struct {
	Type      PartType `json:"type" required:"true"`
	Name      string   `json:"name" required:"true"`
	ID        *string  `json:"id,omitempty"`
	Arguments any      `json:"arguments,omitempty"`
}

// ToolCallResponsePart carries a client tool result, or a built-in tool outcome.
type ToolCallResponsePart struct {
	Type     PartType `json:"type" required:"true"`
	Response any      `json:"response" required:"true" nullable:"true"`
	ID       *string  `json:"id,omitempty"`
}

// ServerToolCallPart is a tool the provider ran itself, such as code_interpreter or web_search.
type ServerToolCallPart struct {
	Type           PartType              `json:"type" required:"true"`
	Name           string                `json:"name" required:"true"`
	ID             *string               `json:"id,omitempty"`
	ServerToolCall GenericServerToolCall `json:"server_tool_call" required:"true" nullable:"false"`
}

// GenericServerToolCall is the provider's own call object, {type, ...} with any other keys.
type GenericServerToolCall map[string]any

type ServerToolCallResponsePart struct {
	Type                   PartType                      `json:"type" required:"true"`
	ID                     *string                       `json:"id,omitempty"`
	ServerToolCallResponse GenericServerToolCallResponse `json:"server_tool_call_response" required:"true" nullable:"false"`
}

// GenericServerToolCallResponse is the provider's own response object, {type, ...} with any other keys.
type GenericServerToolCallResponse map[string]any

// BlobPart is inline data; Content is base64.
type BlobPart struct {
	Type     PartType `json:"type" required:"true"`
	Modality Modality `json:"modality" required:"true"`
	Content  string   `json:"content" required:"true"`
	MimeType *string  `json:"mime_type,omitempty"`
}

// FilePart references a file uploaded to the provider.
type FilePart struct {
	Type     PartType `json:"type" required:"true"`
	Modality Modality `json:"modality" required:"true"`
	FileID   string   `json:"file_id" required:"true"`
	MimeType *string  `json:"mime_type,omitempty"`
}

// UriPart references external data; a data: URL belongs in BlobPart instead.
type UriPart struct {
	Type     PartType `json:"type" required:"true"`
	Modality Modality `json:"modality" required:"true"`
	URI      string   `json:"uri" required:"true"`
	MimeType *string  `json:"mime_type,omitempty"`
}

type ReasoningPart struct {
	Type    PartType `json:"type" required:"true"`
	Content string   `json:"content" required:"true"`
}

// CompactionPart is compacted conversation state; Content is the summary when it is not encrypted.
type CompactionPart struct {
	Type    PartType `json:"type" required:"true"`
	ID      *string  `json:"id,omitempty"`
	Content *string  `json:"content,omitempty"`
}

// GenericPart keeps a part of any other type as sent.
type GenericPart map[string]any

func (Part) JSONSchemaOneOf() []any {
	oneOf := make([]any, 0, len(partVariants)+1)
	for _, variant := range partVariants {
		oneOf = append(oneOf, variant.schema)
	}
	return append(oneOf, GenericPart{})
}

func (Part) PrepareJSONSchema(schema *jsonschema.Schema) error {
	if schema.ExtraProperties == nil {
		schema.ExtraProperties = map[string]any{}
	}
	mapping := make(map[string]string, len(partVariants))
	for _, variant := range partVariants {
		mapping[variant.typ.StringValue()] = variant.schemaRef
	}
	schema.ExtraProperties["x-signoz-discriminator"] = map[string]any{
		"propertyName": "type",
		"mapping":      mapping,
	}
	return nil
}

func (p Part) MarshalJSON() ([]byte, error) {
	return json.Marshal(p.Value)
}

func (p *Part) UnmarshalJSON(data []byte) error {
	var head struct {
		Type PartType `json:"type"`
	}
	if err := json.Unmarshal(data, &head); err != nil {
		return err
	}
	decode := decodePart[GenericPart]
	for _, variant := range partVariants {
		if variant.typ == head.Type {
			decode = variant.decode
			break
		}
	}
	value, err := decode(data)
	if err != nil {
		return err
	}
	p.Value = value
	return nil
}

type partVariant struct {
	typ       PartType
	decode    func(data []byte) (any, error)
	schema    any
	schemaRef string
}

func decodePart[T any](data []byte) (any, error) {
	var value T
	if err := json.Unmarshal(data, &value); err != nil {
		return nil, err
	}
	return value, nil
}
