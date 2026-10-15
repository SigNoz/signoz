package aiobservabilitytypes

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	FormatterSemconv    = "semconv"
	FormatterOpenAIChat = "openai.chat"
	FormatterText       = "text"
	FormatterGeneric    = "generic"
)

var dataURL = regexp.MustCompile(`^data:([^;,]+);base64,(.+)$`)

// Provider spellings of the finish reasons; the enum values themselves pass through. tool_calls and
// function_call are OpenAI's, end_turn, stop_sequence and max_tokens Anthropic's, tool-calls the Vercel AI SDK's:
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L44782
// https://platform.claude.com/docs/en/api/messages
// https://github.com/vercel/ai/blob/a5e92fe3c692f8e152fe1eb9ef50a4e734ad0ffb/packages/provider/src/language-model/v2/language-model-v2-finish-reason.ts
var finishReasonAliases = map[string]FinishReason{
	"tool_calls": FinishReasonToolCall, "function_call": FinishReasonToolCall, "tool-calls": FinishReasonToolCall,
	"end_turn": FinishReasonStop, "stop_sequence": FinishReasonStop,
	"max_tokens": FinishReasonLength,
}

// FormattedMessages is the OTel GenAI view of one span's messages; Warnings holds what the converter could
// not resolve. The lists are never nil.
type FormattedMessages struct {
	Input    InputMessages
	Output   OutputMessages
	Warnings []string
}

// FormatMessages builds the OTel GenAI view of a span's messages from the formats SDKs write. attributes
// is the span's JSON attribute document, nested by key segment, so an object value is whole. Each
// message value is a JSON string or a structured value. A tool call and its result take precedence over
// messages beside them. gen_ai.system_instructions leads the input and gen_ai.response.finish_reasons
// overrides the finish reasons the converter found, whichever converter ran.
func FormatMessages(attributes map[string]any) FormattedMessages {
	f := &formatting{attributes: attributes, out: FormattedMessages{Input: InputMessages{}, Output: OutputMessages{}, Warnings: []string{}}}
	switch {
	case attribute(f.attributes, GenAIToolCallArguments) != nil || attribute(f.attributes, GenAIToolCallResult) != nil:
		f.tool()
	case attribute(f.attributes, GenAIInputMessages) != nil || attribute(f.attributes, GenAIOutputMessages) != nil:
		f.messages()
	}
	f.prependSystemInstructions()
	f.fillFinishReasons()
	return f.out
}

type formatting struct {
	attributes map[string]any
	out        FormattedMessages
}

func (f *formatting) warn(format string, args ...any) {
	f.out.Warnings = append(f.out.Warnings, fmt.Sprintf(format, args...))
}

// messages converts gen_ai.input.messages and gen_ai.output.messages, each by its own shape.
func (f *formatting) messages() {
	var inputLabel, outputLabel string
	if input := attribute(f.attributes, GenAIInputMessages); input != nil {
		var msgs OutputMessages
		msgs, inputLabel = f.side(decode(input), RoleUser)
		for _, m := range msgs {
			f.out.Input = append(f.out.Input, ChatMessage{Role: m.Role, Parts: m.Parts, Name: m.Name})
		}
	}
	if output := attribute(f.attributes, GenAIOutputMessages); output != nil {
		f.out.Output, outputLabel = f.side(decode(output), RoleAssistant)
	}
	if inputLabel != "" && outputLabel != "" && outputLabel != inputLabel {
		f.warn("output formatted as %s, input as %s", outputLabel, inputLabel)
	}
}

// prependSystemInstructions adds gen_ai.system_instructions, a list of parts, as a leading system message.
// A span without messages, such as create_agent, stays without them.
// https://github.com/open-telemetry/semantic-conventions-genai/blob/06ec68e722c45a7218e23ea1bc1339fe4e21ecae/model/gen-ai/gen-ai-system-instructions.json
func (f *formatting) prependSystemInstructions() {
	raw := attribute(f.attributes, GenAISystemInstructions)
	if raw == nil || (len(f.out.Input) == 0 && len(f.out.Output) == 0) {
		return
	}
	if parts := systemParts(decode(raw)); len(parts) > 0 {
		f.out.Input = append(InputMessages{{Role: RoleSystem, Parts: parts}}, f.out.Input...)
	}
}

// fillFinishReasons applies gen_ai.response.finish_reasons, one entry per output message, over
// whatever the converter found in the payload.
// https://github.com/open-telemetry/semantic-conventions-genai/blob/06ec68e722c45a7218e23ea1bc1339fe4e21ecae/model/gen-ai/registry.yaml#L210
func (f *formatting) fillFinishReasons() {
	raw := attribute(f.attributes, GenAIResponseFinishReasons)
	if raw == nil || len(f.out.Output) == 0 {
		return
	}
	reasons := stringList(decode(raw))
	if len(reasons) != len(f.out.Output) {
		f.warn("gen_ai.response.finish_reasons has %d entries for %d output messages", len(reasons), len(f.out.Output))
		return
	}
	for i, reason := range reasons {
		if fr := finishReason(reason); fr != nil {
			f.out.Output[i].FinishReason = fr
		}
	}
}

// side converts one attribute value by its shape; role is what a bare string on this side is
// spoken as.
func (f *formatting) side(value any, role Role) (OutputMessages, string) {
	switch v := value.(type) {
	case []any:
		if first, ok := firstObject(v); ok {
			if _, ok := first["parts"]; ok {
				return f.semconv(v), FormatterSemconv
			}
			if _, ok := first["role"]; ok {
				return f.openAIChatMessages(v), FormatterOpenAIChat
			}
		}
	case map[string]any:
		if choices, ok := v["choices"].([]any); ok {
			return f.openAIChatResponse(choices), FormatterOpenAIChat
		}
		if messages, ok := v["messages"].([]any); ok {
			return f.openAIChatMessages(messages), FormatterOpenAIChat
		}
	case string:
		if v == "" {
			return OutputMessages{}, FormatterText
		}
		f.warn("bare %s text, role assumed", role.StringValue())
		return OutputMessages{{Role: role, Parts: Parts{part(textPart(v))}}}, FormatterText
	}
	f.warn("message format not recognised, kept as generic")
	return OutputMessages{genericMessage(value)}, FormatterGeneric
}

// attribute walks the document along the dotted key; a nested object comes back whole. Not handled: a
// scalar at a prefix of the path, such as gen_ai.input beside gen_ai.input.messages, which ends the
// walk early.
func attribute(doc map[string]any, key string) any {
	var current any = doc
	for segment := range strings.SplitSeq(key, ".") {
		object, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		current = object[segment]
	}
	return current
}

func firstObject(list []any) (map[string]any, bool) {
	if len(list) == 0 {
		return nil, false
	}
	first, ok := list[0].(map[string]any)
	return first, ok
}

func genericMessage(value any) OutputMessage {
	return OutputMessage{Parts: Parts{part(GenericPart{"type": FormatterGeneric, "content": stringOf(value)})}}
}

// decode parses a JSON-encoded attribute value, twice when an SDK encoded the string again.
// Anything that is not JSON is returned as is.
func decode(value any) any {
	s, ok := value.(string)
	if !ok {
		return value
	}
	trimmed := strings.TrimSpace(s)
	if trimmed == "" || !strings.ContainsAny(trimmed[:1], `[{"`) {
		return s
	}
	var decoded any
	if err := json.Unmarshal([]byte(trimmed), &decoded); err != nil {
		return s
	}
	if inner, ok := decoded.(string); ok {
		return decode(inner)
	}
	return decoded
}

func role(value string) Role {
	lower := strings.ToLower(strings.TrimSpace(value))
	switch lower {
	case "human":
		return RoleUser
	case "ai", "model":
		return RoleAssistant
	case "function":
		return RoleTool
	}
	return Role{String: valuer.NewString(lower)}
}

func finishReason(value string) *FinishReason {
	lower := strings.ToLower(strings.TrimSpace(value))
	if lower == "" {
		return nil
	}
	fr, ok := finishReasonAliases[lower]
	if !ok {
		fr = FinishReason{String: valuer.NewString(lower)}
	}
	return &fr
}

// stringList reads a list of strings, or a bare string as a list of one.
func stringList(value any) []string {
	switch v := value.(type) {
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			out = append(out, stringOf(item))
		}
		return out
	case string:
		if v != "" {
			return []string{v}
		}
	}
	return nil
}

func optionalString(value any) *string {
	s := stringOf(value)
	if s == "" {
		return nil
	}
	return &s
}

func part(value any) Part {
	return Part{Value: value}
}

func textPart(content string) TextPart {
	return TextPart{Type: PartTypeText, Content: content}
}

// systemParts reads a system prompt given outside the history, a list of parts or a bare string.
func systemParts(value any) Parts {
	switch v := value.(type) {
	case []any:
		parts := make(Parts, 0, len(v))
		for _, item := range v {
			parts = append(parts, contentPart(item))
		}
		return parts
	case string:
		if v != "" {
			return Parts{part(textPart(v))}
		}
	}
	return nil
}

// contentPart converts one OpenAI content block, which semconv parts may also carry; a text part
// in the semconv spelling has content where OpenAI has text. A block of any other type is kept
// as sent.
func contentPart(item any) Part {
	p, ok := item.(map[string]any)
	if !ok {
		if s, ok := item.(string); ok {
			return part(textPart(s))
		}
		return part(GenericPart{"type": FormatterGeneric, "content": stringOf(item)})
	}
	switch stringOf(p["type"]) {
	case "text":
		if p["text"] == nil {
			return part(textPart(stringOf(p["content"])))
		}
		return part(textPart(stringOf(p["text"])))
	case "refusal":
		return part(textPart(stringOf(p["refusal"])))
	case "image_url":
		url := stringOf(p["image_url"])
		if ref, ok := p["image_url"].(map[string]any); ok {
			url = stringOf(ref["url"])
		}
		if url != "" {
			return part(mediaPart(url, ModalityImage))
		}
	case "file":
		if f, ok := filePart(p); ok {
			return f
		}
	}
	return part(GenericPart(p))
}

// filePart reads {file: {file_id}} or {file: {file_data, filename}}; Chat Completions accepts only PDF here.
func filePart(block map[string]any) (Part, bool) {
	f, _ := block["file"].(map[string]any)
	if id := stringOf(f["file_id"]); id != "" {
		mime := "application/pdf"
		return part(FilePart{Type: PartTypeFile, Modality: ModalityDocument, FileID: id, MimeType: &mime}), true
	}
	if data := stringOf(f["file_data"]); data != "" {
		return part(mediaPart(data, ModalityDocument)), true
	}
	return Part{}, false
}

// mediaPart places a data URL in a BlobPart, any other URL in a UriPart.
func mediaPart(url string, modality Modality) any {
	if m := dataURL.FindStringSubmatch(url); m != nil {
		return BlobPart{Type: PartTypeBlob, Modality: modality, MimeType: &m[1], Content: m[2]}
	}
	return UriPart{Type: PartTypeURI, Modality: modality, URI: url}
}

// stringOf renders nil as "" and non-strings as compact JSON.
func stringOf(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return v
	}
	data, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(data)
}
