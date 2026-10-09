package genai

import (
	"encoding/json"

	"github.com/swaggest/jsonschema-go"
)

const (
	PartTypeText                   PartType = "text"
	PartTypeToolCall               PartType = "tool_call"
	PartTypeToolCallResponse       PartType = "tool_call_response"
	PartTypeServerToolCall         PartType = "server_tool_call"
	PartTypeServerToolCallResponse PartType = "server_tool_call_response"
	PartTypeBlob                   PartType = "blob"
	PartTypeFile                   PartType = "file"
	PartTypeURI                    PartType = "uri"
	PartTypeReasoning              PartType = "reasoning"
	PartTypeCompaction             PartType = "compaction"
)

var (
	_ jsonschema.OneOfExposer = Part{}
	_ jsonschema.Preparer     = Part{}
)

// partVariants are the part types the schema names; any other type decodes as GenericPart.
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

type PartType string

// Part is one message part, the schema's anyOf discriminated on "type". Value holds the part
// struct for that type and is encoded as the part itself.
type Part struct {
	Value any `json:"-"`
}

type Parts []Part

type TextPart struct {
	Type                 PartType       `json:"type" required:"true"`
	Content              string         `json:"content" required:"true"`
	AdditionalProperties map[string]any `json:"-"`
}

type ToolCallRequestPart struct {
	Type                 PartType       `json:"type" required:"true"`
	Name                 string         `json:"name" required:"true"`
	ID                   *string        `json:"id,omitempty"`
	Arguments            any            `json:"arguments,omitempty"`
	AdditionalProperties map[string]any `json:"-"`
}

// ToolCallResponsePart carries a client tool result, or a built-in tool outcome.
type ToolCallResponsePart struct {
	Type                 PartType       `json:"type" required:"true"`
	Response             any            `json:"response" required:"true" nullable:"true"`
	ID                   *string        `json:"id,omitempty"`
	AdditionalProperties map[string]any `json:"-"`
}

// ServerToolCallPart is a tool the provider ran itself, such as code_interpreter or web_search.
type ServerToolCallPart struct {
	Type                 PartType              `json:"type" required:"true"`
	Name                 string                `json:"name" required:"true"`
	ID                   *string               `json:"id,omitempty"`
	ServerToolCall       GenericServerToolCall `json:"server_tool_call" required:"true"`
	AdditionalProperties map[string]any        `json:"-"`
}

type GenericServerToolCall struct {
	Type                 string         `json:"type" required:"true"`
	AdditionalProperties map[string]any `json:"-"`
}

type ServerToolCallResponsePart struct {
	Type                   PartType                      `json:"type" required:"true"`
	ID                     *string                       `json:"id,omitempty"`
	ServerToolCallResponse GenericServerToolCallResponse `json:"server_tool_call_response" required:"true"`
	AdditionalProperties   map[string]any                `json:"-"`
}

type GenericServerToolCallResponse struct {
	Type                 string         `json:"type" required:"true"`
	AdditionalProperties map[string]any `json:"-"`
}

// BlobPart is inline data; Content is base64. The schema allows no extra keys here.
type BlobPart struct {
	Type     PartType `json:"type" required:"true"`
	Modality Modality `json:"modality" required:"true"`
	Content  string   `json:"content" required:"true"`
	MimeType *string  `json:"mime_type,omitempty"`
}

// FilePart references a file uploaded to the provider.
type FilePart struct {
	Type                 PartType       `json:"type" required:"true"`
	Modality             Modality       `json:"modality" required:"true"`
	FileID               string         `json:"file_id" required:"true"`
	MimeType             *string        `json:"mime_type,omitempty"`
	AdditionalProperties map[string]any `json:"-"`
}

// UriPart references external data; a data: URL belongs in BlobPart instead.
type UriPart struct {
	Type                 PartType       `json:"type" required:"true"`
	Modality             Modality       `json:"modality" required:"true"`
	URI                  string         `json:"uri" required:"true"`
	MimeType             *string        `json:"mime_type,omitempty"`
	AdditionalProperties map[string]any `json:"-"`
}

type ReasoningPart struct {
	Type                 PartType       `json:"type" required:"true"`
	Content              string         `json:"content" required:"true"`
	AdditionalProperties map[string]any `json:"-"`
}

// CompactionPart is compacted conversation state; Content is the summary when it is not encrypted.
type CompactionPart struct {
	Type                 PartType       `json:"type" required:"true"`
	ID                   *string        `json:"id,omitempty"`
	Content              *string        `json:"content,omitempty"`
	AdditionalProperties map[string]any `json:"-"`
}

// GenericPart keeps a part of any other type as sent.
type GenericPart struct {
	Type                 PartType       `json:"type" required:"true"`
	AdditionalProperties map[string]any `json:"-"`
}

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
		mapping[string(variant.typ)] = variant.schemaRef
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

func (p TextPart) MarshalJSON() ([]byte, error) {
	type plain TextPart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *TextPart) UnmarshalJSON(data []byte) error {
	type plain TextPart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = TextPart(v)
	p.AdditionalProperties = extras
	return nil
}

func (p ToolCallRequestPart) MarshalJSON() ([]byte, error) {
	type plain ToolCallRequestPart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *ToolCallRequestPart) UnmarshalJSON(data []byte) error {
	type plain ToolCallRequestPart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = ToolCallRequestPart(v)
	p.AdditionalProperties = extras
	return nil
}

func (p ToolCallResponsePart) MarshalJSON() ([]byte, error) {
	type plain ToolCallResponsePart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *ToolCallResponsePart) UnmarshalJSON(data []byte) error {
	type plain ToolCallResponsePart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = ToolCallResponsePart(v)
	p.AdditionalProperties = extras
	return nil
}

func (p ServerToolCallPart) MarshalJSON() ([]byte, error) {
	type plain ServerToolCallPart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *ServerToolCallPart) UnmarshalJSON(data []byte) error {
	type plain ServerToolCallPart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = ServerToolCallPart(v)
	p.AdditionalProperties = extras
	return nil
}

func (c GenericServerToolCall) MarshalJSON() ([]byte, error) {
	type plain GenericServerToolCall
	return marshalWithExtras(plain(c), c.AdditionalProperties)
}

func (c *GenericServerToolCall) UnmarshalJSON(data []byte) error {
	type plain GenericServerToolCall
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*c = GenericServerToolCall(v)
	c.AdditionalProperties = extras
	return nil
}

func (p ServerToolCallResponsePart) MarshalJSON() ([]byte, error) {
	type plain ServerToolCallResponsePart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *ServerToolCallResponsePart) UnmarshalJSON(data []byte) error {
	type plain ServerToolCallResponsePart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = ServerToolCallResponsePart(v)
	p.AdditionalProperties = extras
	return nil
}

func (c GenericServerToolCallResponse) MarshalJSON() ([]byte, error) {
	type plain GenericServerToolCallResponse
	return marshalWithExtras(plain(c), c.AdditionalProperties)
}

func (c *GenericServerToolCallResponse) UnmarshalJSON(data []byte) error {
	type plain GenericServerToolCallResponse
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*c = GenericServerToolCallResponse(v)
	c.AdditionalProperties = extras
	return nil
}

func (p BlobPart) MarshalJSON() ([]byte, error) {
	type plain BlobPart
	p.Type = p.partType()
	return json.Marshal(plain(p))
}

func (p FilePart) MarshalJSON() ([]byte, error) {
	type plain FilePart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *FilePart) UnmarshalJSON(data []byte) error {
	type plain FilePart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = FilePart(v)
	p.AdditionalProperties = extras
	return nil
}

func (p UriPart) MarshalJSON() ([]byte, error) {
	type plain UriPart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *UriPart) UnmarshalJSON(data []byte) error {
	type plain UriPart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = UriPart(v)
	p.AdditionalProperties = extras
	return nil
}

func (p ReasoningPart) MarshalJSON() ([]byte, error) {
	type plain ReasoningPart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *ReasoningPart) UnmarshalJSON(data []byte) error {
	type plain ReasoningPart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = ReasoningPart(v)
	p.AdditionalProperties = extras
	return nil
}

func (p CompactionPart) MarshalJSON() ([]byte, error) {
	type plain CompactionPart
	p.Type = p.partType()
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *CompactionPart) UnmarshalJSON(data []byte) error {
	type plain CompactionPart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = CompactionPart(v)
	p.AdditionalProperties = extras
	return nil
}

func (p GenericPart) MarshalJSON() ([]byte, error) {
	type plain GenericPart
	return marshalWithExtras(plain(p), p.AdditionalProperties)
}

func (p *GenericPart) UnmarshalJSON(data []byte) error {
	type plain GenericPart
	var v plain
	extras, err := unmarshalWithExtras(data, &v)
	if err != nil {
		return err
	}
	*p = GenericPart(v)
	p.AdditionalProperties = extras
	return nil
}

func (TextPart) partType() PartType                   { return PartTypeText }
func (ToolCallRequestPart) partType() PartType        { return PartTypeToolCall }
func (ToolCallResponsePart) partType() PartType       { return PartTypeToolCallResponse }
func (ServerToolCallPart) partType() PartType         { return PartTypeServerToolCall }
func (ServerToolCallResponsePart) partType() PartType { return PartTypeServerToolCallResponse }
func (BlobPart) partType() PartType                   { return PartTypeBlob }
func (FilePart) partType() PartType                   { return PartTypeFile }
func (UriPart) partType() PartType                    { return PartTypeURI }
func (ReasoningPart) partType() PartType              { return PartTypeReasoning }
func (CompactionPart) partType() PartType             { return PartTypeCompaction }
func (p GenericPart) partType() PartType              { return p.Type }

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
