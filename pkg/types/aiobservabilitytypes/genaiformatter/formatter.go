// Package genaiformatter builds the OTel GenAI view of a span's messages from the formats SDKs
// write into gen_ai.input.messages and gen_ai.output.messages.
package genaiformatter

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes/genai"
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
var finishReasonAliases = map[string]genai.FinishReason{
	"tool_calls": genai.FinishReasonToolCall, "function_call": genai.FinishReasonToolCall,
	"end_turn": genai.FinishReasonStop, "stop_sequence": genai.FinishReasonStop,
	"max_tokens": genai.FinishReasonLength,
}

// Formatted is the OTel GenAI view of one span's messages. Formatter names the converter that
// produced it, Warnings what the converter could not resolve. The lists are never nil.
type Formatted struct {
	Input     genai.InputMessages
	Output    genai.OutputMessages
	Formatter string
	Warnings  []string
}

// Format converts the two attribute values, each a JSON string or a structured value; nil means
// the attribute is absent.
func Format(input, output any) Formatted {
	f := &formatting{out: Formatted{Input: genai.InputMessages{}, Output: genai.OutputMessages{}, Warnings: []string{}}}
	var inputLabel, outputLabel string
	if input != nil {
		var msgs genai.OutputMessages
		msgs, inputLabel = f.side(decode(input), genai.RoleUser)
		for _, m := range msgs {
			f.out.Input = append(f.out.Input, genai.ChatMessage{Role: m.Role, Parts: m.Parts, Name: m.Name})
		}
	}
	if output != nil {
		f.out.Output, outputLabel = f.side(decode(output), genai.RoleAssistant)
	}
	f.out.Formatter = inputLabel
	if inputLabel == "" {
		f.out.Formatter = outputLabel
	} else if outputLabel != "" && outputLabel != inputLabel {
		f.warn("output formatted as %s, input as %s", outputLabel, inputLabel)
	}
	return f.out
}

// object is a decoded JSON object whose accessors return zero values for missing keys.
type object map[string]any

type formatting struct {
	out Formatted
}

func (o object) str(key string) string {
	return stringOf(o[key])
}

func (o object) text(keys ...string) string {
	for _, key := range keys {
		if s, ok := o[key].(string); ok && s != "" {
			return s
		}
	}
	return ""
}

func (o object) obj(key string) (object, bool) {
	m, ok := o[key].(map[string]any)
	return m, ok
}

func (o object) list(key string) ([]any, bool) {
	l, ok := o[key].([]any)
	return l, ok
}

func (f *formatting) warn(format string, args ...any) {
	f.out.Warnings = append(f.out.Warnings, fmt.Sprintf(format, args...))
}

// side converts one attribute value by its shape; role is what a bare string on this side is
// spoken as.
func (f *formatting) side(value any, role genai.Role) (genai.OutputMessages, string) {
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
		if choices, ok := object(v).list("choices"); ok {
			return f.openAIChatResponse(choices), FormatterOpenAIChat
		}
		if messages, ok := object(v).list("messages"); ok {
			return f.openAIChatMessages(messages), FormatterOpenAIChat
		}
	case string:
		if v == "" {
			return genai.OutputMessages{}, FormatterText
		}
		f.warn("bare %s text, role assumed", role.StringValue())
		return genai.OutputMessages{{Role: role, Parts: genai.Parts{part(textPart(v))}}}, FormatterText
	}
	f.warn("message format not recognised, kept as generic")
	return genai.OutputMessages{genericMessage(value)}, FormatterGeneric
}

func firstObject(list []any) (object, bool) {
	if len(list) == 0 {
		return nil, false
	}
	first, ok := list[0].(map[string]any)
	return first, ok
}

func genericMessage(value any) genai.OutputMessage {
	return genai.OutputMessage{Parts: genai.Parts{part(genai.GenericPart{"type": FormatterGeneric, "content": stringOf(value)})}}
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

func role(value string) genai.Role {
	lower := strings.ToLower(strings.TrimSpace(value))
	switch lower {
	case "human":
		return genai.RoleUser
	case "ai", "model":
		return genai.RoleAssistant
	case "function":
		return genai.RoleTool
	}
	return genai.Role{String: valuer.NewString(lower)}
}

func finishReason(value string) *genai.FinishReason {
	lower := strings.ToLower(strings.TrimSpace(value))
	if lower == "" {
		return nil
	}
	fr, ok := finishReasonAliases[lower]
	if !ok {
		fr = genai.FinishReason{String: valuer.NewString(lower)}
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

func part(value any) genai.Part {
	return genai.Part{Value: value}
}

func textPart(content string) genai.TextPart {
	return genai.TextPart{Type: genai.PartTypeText, Content: content}
}

// contentPart converts one OpenAI content block, which semconv parts may also carry; a block of
// any other type is kept as sent.
func contentPart(item any) genai.Part {
	p, ok := item.(map[string]any)
	if !ok {
		if s, ok := item.(string); ok {
			return part(textPart(s))
		}
		return part(genai.GenericPart{"type": FormatterGeneric, "content": stringOf(item)})
	}
	block := object(p)
	switch block.str("type") {
	case "text":
		return part(textPart(block.str("text")))
	case "refusal":
		return part(textPart(block.str("refusal")))
	case "image_url":
		url := block.str("image_url")
		if ref, ok := block.obj("image_url"); ok {
			url = ref.str("url")
		}
		if url != "" {
			return part(mediaPart(url, genai.ModalityImage))
		}
	}
	return part(genai.GenericPart(p))
}

// mediaPart places a data URL in a BlobPart, any other URL in a UriPart.
func mediaPart(url string, modality genai.Modality) any {
	if m := dataURL.FindStringSubmatch(url); m != nil {
		return genai.BlobPart{Type: genai.PartTypeBlob, Modality: modality, MimeType: &m[1], Content: m[2]}
	}
	return genai.UriPart{Type: genai.PartTypeURI, Modality: modality, URI: url}
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
