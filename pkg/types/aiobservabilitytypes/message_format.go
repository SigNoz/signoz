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

// Provider spellings of the finish reasons; the enum values themselves pass through.
var finishReasonAliases = map[string]FinishReason{
	"tool_calls": FinishReasonToolCall, "function_call": FinishReasonToolCall,
	"end_turn": FinishReasonStop, "stop_sequence": FinishReasonStop,
	"max_tokens": FinishReasonLength,
}

// FormattedMessages is the OTel GenAI view of one span's messages. Formatter names the converter that
// produced it, Warnings what the converter could not resolve. The lists are never nil.
type FormattedMessages struct {
	Input     InputMessages
	Output    OutputMessages
	Formatter string
	Warnings  []string
}

// FormatMessages builds the OTel GenAI view of gen_ai.input.messages and gen_ai.output.messages from the
// formats SDKs write. Each value is a JSON string or a structured value; nil means absent.
func FormatMessages(input, output any) FormattedMessages {
	f := &formatting{out: FormattedMessages{Input: InputMessages{}, Output: OutputMessages{}, Warnings: []string{}}}
	var inputLabel, outputLabel string
	if input != nil {
		var msgs OutputMessages
		msgs, inputLabel = f.side(decode(input), RoleUser)
		for _, m := range msgs {
			f.out.Input = append(f.out.Input, ChatMessage{Role: m.Role, Parts: m.Parts, Name: m.Name})
		}
	}
	if output != nil {
		f.out.Output, outputLabel = f.side(decode(output), RoleAssistant)
	}
	f.out.Formatter = inputLabel
	if inputLabel == "" {
		f.out.Formatter = outputLabel
	} else if outputLabel != "" && outputLabel != inputLabel {
		f.warn("output formatted as %s, input as %s", outputLabel, inputLabel)
	}
	return f.out
}

type formatting struct {
	out FormattedMessages
}

func (f *formatting) warn(format string, args ...any) {
	f.out.Warnings = append(f.out.Warnings, fmt.Sprintf(format, args...))
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

// contentPart converts one OpenAI content block, which semconv parts may also carry; a block of
// any other type is kept as sent.
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
