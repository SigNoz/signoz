package aiobservabilitytypes

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	FormatterSemconv         = "semconv"
	FormatterTool            = "tool"
	FormatterOpenInference   = "openinference"
	FormatterTraceloop       = "traceloop"
	FormatterVercel          = "vercel"
	FormatterLangChain       = "langchain"
	FormatterOpenRouter      = "openrouter"
	FormatterOpenAIChat      = "openai.chat"
	FormatterOpenAIResponses = "openai.responses"
	FormatterText            = "text"
	FormatterGeneric         = "generic"
)

var dataURL = regexp.MustCompile(`^data:([^;,]+);base64,(.+)$`)

// Provider spellings of the finish reasons; the enum values themselves pass through.
var finishReasonAliases = map[string]FinishReason{
	"tool_calls": FinishReasonToolCall, "function_call": FinishReasonToolCall, "tool_use": FinishReasonToolCall, "tool-calls": FinishReasonToolCall,
	"end_turn": FinishReasonStop, "stop_sequence": FinishReasonStop, "completed": FinishReasonStop, "eos": FinishReasonStop,
	"max_tokens": FinishReasonLength, "max_output_tokens": FinishReasonLength, "model_length": FinishReasonLength,
	"safety": FinishReasonContentFilter, "recitation": FinishReasonContentFilter, "content_filtered": FinishReasonContentFilter, "content-filter": FinishReasonContentFilter, "guardrail_intervened": FinishReasonContentFilter,
	"failed": FinishReasonError, "cancelled": FinishReasonError, "incomplete": FinishReasonError,
}

// Chat Completions input_audio formats, ChatCompletionRequestMessageContentPartAudio in the OpenAI spec.
var audioFormatMimeTypes = map[string]string{"wav": "audio/wav", "mp3": "audio/mpeg"}

// FormattedMessages is the OTel GenAI view of one span's messages. Formatter names the converter that
// produced it, Warnings what the converter could not resolve. The lists are never nil.
type FormattedMessages struct {
	Input     InputMessages
	Output    OutputMessages
	Formatter string
	Warnings  []string
}

// FormatMessages builds the OTel GenAI view of a span's messages from the formats SDKs write. attributes
// is the span's JSON attribute document, nested by key segment, so an object value is whole and the
// flattened llm.input_messages.N.* keys form a tree. Each message value is a JSON string or a
// structured value. gen_ai.system_instructions leads the input and gen_ai.response.finish_reasons
// overrides the finish reasons the converter found, whichever converter ran.
func FormatMessages(attributes map[string]any) FormattedMessages {
	f := &formatting{attrs: attributes, out: FormattedMessages{Input: InputMessages{}, Output: OutputMessages{}, Warnings: []string{}}}
	switch {
	case f.openInference():
	case f.attr(GenAIToolCallArguments) != nil || f.attr(GenAIToolCallResult) != nil:
		f.tool()
	case f.vercel():
	case f.attr(GenAIInputMessages) != nil || f.attr(GenAIOutputMessages) != nil:
		f.messages()
	case f.traceloop():
	}
	f.prependSystemInstructions()
	f.fillFinishReasons()
	return f.out
}

type formatting struct {
	attrs map[string]any
	out   FormattedMessages
}

// Not handled: a scalar at a prefix of the path, such as gen_ai.input beside gen_ai.input.messages,
// which ends the walk early.
func (f *formatting) attr(key string) any {
	return attribute(f.attrs, key)
}

func (f *formatting) warn(format string, args ...any) {
	f.out.Warnings = append(f.out.Warnings, fmt.Sprintf(format, args...))
}

// messages converts gen_ai.input.messages and gen_ai.output.messages, each by its own shape. An
// output message left without parts takes the tool calls from the flattened gen_ai.completion.N
// keys litellm writes beside the semconv value.
func (f *formatting) messages() {
	var inputLabel, outputLabel string
	if input := f.attr(GenAIInputMessages); input != nil {
		var msgs OutputMessages
		msgs, inputLabel = f.side(decode(input), RoleUser)
		f.out.Input = inputMessages(msgs)
	}
	if output := f.attr(GenAIOutputMessages); output != nil {
		f.out.Output, outputLabel = f.side(decode(output), RoleAssistant)
		for i := range f.out.Output {
			if len(f.out.Output[i].Parts) == 0 {
				f.out.Output[i].Parts = append(f.out.Output[i].Parts, traceloopToolCalls(indexedAt(f.attrs, traceloopCompletions, i))...)
			}
		}
	}
	f.label(inputLabel, outputLabel)
}

// label names the formatter after the input side, or the output side when the input has none, and
// warns when the two sides came from different converters. A gateway answer object beside the
// OpenAI chat request it answers is one format.
func (f *formatting) label(inputLabel, outputLabel string) {
	f.out.Formatter = inputLabel
	switch {
	case inputLabel == "":
		f.out.Formatter = outputLabel
	case inputLabel == FormatterOpenAIChat && outputLabel == FormatterOpenRouter:
		f.out.Formatter = outputLabel
	case outputLabel != "" && outputLabel != inputLabel:
		f.warn("output formatted as %s, input as %s", outputLabel, inputLabel)
	}
}

// side converts one attribute value by its shape; role is what a bare string on this side is
// spoken as.
func (f *formatting) side(value any, role Role) (OutputMessages, string) {
	switch v := value.(type) {
	case []any:
		if first, ok := firstObject(v); ok {
			switch {
			case first["parts"] != nil:
				return f.semconv(v), FormatterSemconv
			case first["lc"] != nil:
				return f.langChainMessages(v), FormatterLangChain
			case first["role"] != nil:
				return f.openAIChatMessages(v), FormatterOpenAIChat
			}
		}
	case map[string]any:
		switch {
		case isLangChainRun(v):
			return f.langChainRun(v), FormatterLangChain
		case isOpenRouterCompletion(v):
			return f.openRouterCompletion(v), FormatterOpenRouter
		case isResponsesResponse(v):
			return f.responsesResponse(v), FormatterOpenAIResponses
		case isResponsesRequest(v):
			return f.responsesRequest(v), FormatterOpenAIResponses
		}
		if choices, ok := v["choices"].([]any); ok {
			return f.openAIChatResponse(choices), FormatterOpenAIChat
		}
		if messages, ok := v["messages"].([]any); ok {
			return f.openAIChatRequest(v, messages), FormatterOpenAIChat
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

// prependSystemInstructions adds gen_ai.system_instructions as a leading system message, unless the
// input already starts with the same text. A span without messages, such as create_agent, stays
// without them.
func (f *formatting) prependSystemInstructions() {
	raw := f.attr(GenAISystemInstructions)
	if raw == nil || (len(f.out.Input) == 0 && len(f.out.Output) == 0) {
		return
	}
	system := systemMessage(decode(raw))
	if system == nil {
		return
	}
	if len(f.out.Input) > 0 && f.out.Input[0].Role == RoleSystem && textOf(f.out.Input[0].Parts) == textOf(system.Parts) {
		return
	}
	f.out.Input = append(InputMessages{{Role: RoleSystem, Parts: system.Parts}}, f.out.Input...)
}

// fillFinishReasons applies gen_ai.response.finish_reasons, one entry per output message, over
// whatever the converter found in the payload.
func (f *formatting) fillFinishReasons() {
	raw := f.attr(GenAIResponseFinishReasons)
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

// attribute walks the document along the dotted key; a nested object comes back whole.
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

// indexed reads a flattened list, "<key>.<N>.*" keys stored as an object keyed by N, in numeric order.
// A list value is returned as is.
func indexed(doc map[string]any, key string) []map[string]any {
	var items []any
	switch v := attribute(doc, key).(type) {
	case []any:
		items = v
	case map[string]any:
		indexes := make([]int, 0, len(v))
		byIndex := make(map[int]any, len(v))
		for k, item := range v {
			n, err := strconv.Atoi(k)
			if err != nil {
				continue
			}
			indexes = append(indexes, n)
			byIndex[n] = item
		}
		sort.Ints(indexes)
		for _, n := range indexes {
			items = append(items, byIndex[n])
		}
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if m, ok := item.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

// indexedAt reads one entry of a flattened list by its index.
func indexedAt(doc map[string]any, key string, i int) map[string]any {
	m, _ := attribute(doc, key+"."+strconv.Itoa(i)).(map[string]any)
	return m
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

func inputMessages(msgs OutputMessages) InputMessages {
	out := make(InputMessages, 0, len(msgs))
	for _, m := range msgs {
		out = append(out, ChatMessage{Role: m.Role, Parts: m.Parts, Name: m.Name})
	}
	return out
}

// foldAssistant merges runs of assistant messages into one and drops messages without parts, for
// SDKs that write one message per output item.
func foldAssistant(msgs OutputMessages) OutputMessages {
	out := make(OutputMessages, 0, len(msgs))
	for _, msg := range msgs {
		if len(out) > 0 && msg.Role == RoleAssistant && out[len(out)-1].Role == RoleAssistant {
			last := &out[len(out)-1]
			last.Parts = append(last.Parts, msg.Parts...)
			if last.FinishReason == nil {
				last.FinishReason = msg.FinishReason
			}
			continue
		}
		if len(msg.Parts) == 0 {
			continue
		}
		out = append(out, msg)
	}
	return out
}

// systemMessage turns a system prompt given outside the history, a string or a list of parts, into
// a leading system message.
func systemMessage(value any) *OutputMessage {
	var parts Parts
	switch v := value.(type) {
	case string:
		if v != "" {
			parts = Parts{part(textPart(v))}
		}
	case []any:
		for _, item := range v {
			parts = append(parts, contentPart(item))
		}
	}
	if len(parts) == 0 {
		return nil
	}
	return &OutputMessage{Role: RoleSystem, Parts: parts}
}

// textOf joins the text parts, for comparing a system message with gen_ai.system_instructions and
// for a tool result given as text items.
func textOf(parts Parts) string {
	var texts []string
	for _, p := range parts {
		if t, ok := p.Value.(TextPart); ok {
			texts = append(texts, t.Content)
		}
	}
	return strings.Join(texts, "\n")
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

func stringList(value any) []string {
	switch v := value.(type) {
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			out = append(out, stringOf(item))
		}
		return out
	case string:
		if v == "" {
			return nil
		}
		return []string{v}
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

// contentPart converts one content block in the OpenAI Chat Completions or Responses spelling,
// which semconv parts may also carry; a block of any other type is kept as sent.
func contentPart(item any) Part {
	p, ok := item.(map[string]any)
	if !ok {
		if s, ok := item.(string); ok {
			return part(textPart(s))
		}
		return part(GenericPart{"type": FormatterGeneric, "content": stringOf(item)})
	}
	switch stringOf(p["type"]) {
	case "text", "input_text", "output_text", "summary_text":
		if p["text"] == nil {
			return part(textPart(stringOf(p["content"])))
		}
		return part(textPart(stringOf(p["text"])))
	case "refusal":
		return part(textPart(stringOf(p["refusal"])))
	case "image_url", "input_image":
		url := stringOf(p["image_url"])
		if ref, ok := p["image_url"].(map[string]any); ok {
			url = stringOf(ref["url"])
		}
		if url != "" {
			return part(mediaPart(url, ModalityImage))
		}
		if id := stringOf(p["file_id"]); id != "" {
			return part(FilePart{Type: PartTypeFile, Modality: ModalityImage, FileID: id})
		}
	case "input_audio":
		if audio, ok := p["input_audio"].(map[string]any); ok {
			if data := stringOf(audio["data"]); data != "" {
				return part(audioPart(data, audioFormatMimeTypes[stringOf(audio["format"])]))
			}
		}
	case "file":
		if f, ok := filePart(p); ok {
			return f
		}
	case "input_file":
		if f, ok := filePart(map[string]any{"file": p}); ok {
			return f
		}
		if url := stringOf(p["file_url"]); url != "" {
			return part(mediaPart(url, ModalityDocument))
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

// audioPart holds base64 audio bytes; mimeType is left unset when the format is not known.
func audioPart(data, mimeType string) BlobPart {
	return BlobPart{Type: PartTypeBlob, Modality: ModalityAudio, Content: data, MimeType: optionalString(mimeType)}
}

// modalityOf maps a MIME type to the schema modality, document for anything that is not media.
func modalityOf(mimeType string) Modality {
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		return ModalityImage
	case strings.HasPrefix(mimeType, "audio/"):
		return ModalityAudio
	case strings.HasPrefix(mimeType, "video/"):
		return ModalityVideo
	}
	return ModalityDocument
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
