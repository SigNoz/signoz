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
	FormatterOpenInference   = "openinference"
	FormatterLangChain       = "langchain"
	FormatterOpenRouter      = "openrouter"
	FormatterAnthropic       = "anthropic"
	FormatterGemini          = "gemini"
	FormatterOpenAIChat      = "openai.chat"
	FormatterOpenAIResponses = "openai.responses"
	FormatterText            = "text"
	FormatterGeneric         = "generic"
)

var (
	dataURL   = regexp.MustCompile(`^data:([^;,]+);base64,(.+)$`)
	urlScheme = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9+.-]*:`)
)

// Provider spellings of the finish reasons; the enum values themselves pass through. tool_calls and
// function_call are OpenAI's, completed, failed, cancelled, incomplete and max_output_tokens the Responses
// status and incomplete reason, end_turn, stop_sequence, max_tokens, tool_use, refusal and
// model_context_window_exceeded Anthropic's, the upper-case ones Gemini's, tool-calls and content-filter
// the Vercel AI SDK's:
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L44782
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L69691
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/stop_reason.py#L5
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L510
// https://github.com/vercel/ai/blob/a5e92fe3c692f8e152fe1eb9ef50a4e734ad0ffb/packages/provider/src/language-model/v2/language-model-v2-finish-reason.ts
var finishReasonAliases = map[string]FinishReason{
	"tool_calls": FinishReasonToolCall, "function_call": FinishReasonToolCall, "tool-calls": FinishReasonToolCall, "tool_use": FinishReasonToolCall,
	"end_turn": FinishReasonStop, "stop_sequence": FinishReasonStop, "completed": FinishReasonStop,
	"max_tokens": FinishReasonLength, "max_output_tokens": FinishReasonLength, "model_context_window_exceeded": FinishReasonLength,
	"content-filter": FinishReasonContentFilter, "refusal": FinishReasonContentFilter, "safety": FinishReasonContentFilter, "recitation": FinishReasonContentFilter,
	"blocklist": FinishReasonContentFilter, "prohibited_content": FinishReasonContentFilter, "spii": FinishReasonContentFilter, "image_safety": FinishReasonContentFilter,
	"failed": FinishReasonError, "cancelled": FinishReasonError, "incomplete": FinishReasonError, "malformed_function_call": FinishReasonError,
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
// message value is a JSON string or a structured value. An embeddings call has no messages, whatever the
// mapper moved onto the message attributes. OpenInference's flattened messages come first,
// then a tool call and its result, then the AI SDK's ai.* keys, then the message attributes, then
// openllmetry's flattened prompts and completions. gen_ai.system_instructions leads the
// input and gen_ai.response.finish_reasons overrides the finish reasons the converter found, whichever
// converter ran.
func FormatMessages(attributes map[string]any) FormattedMessages {
	f := &formatting{attributes: attributes, out: FormattedMessages{Input: InputMessages{}, Output: OutputMessages{}, Warnings: []string{}}}
	if isEmbeddings(attributes) {
		return f.out
	}
	switch {
	case f.openInference():
	case attribute(f.attributes, GenAIToolCallArguments) != nil || attribute(f.attributes, GenAIToolCallResult) != nil:
		f.tool()
	case f.vercel():
	case attribute(f.attributes, GenAIInputMessages) != nil || attribute(f.attributes, GenAIOutputMessages) != nil:
		f.messages()
	case f.traceloop():
	}
	f.prependSystemInstructions()
	f.fillFinishReasons()
	f.genericMedia()
	return f.out
}

// isEmbeddings matches the operation name as the semconv embeddings, openllmetry's llm.request.type
// embedding and OpenInference's span kind EMBEDDING, copied by the mapper, or the AI SDK's ai.embed* ids.
// https://github.com/open-telemetry/semantic-conventions-genai/blob/06ec68e722c45a7218e23ea1bc1339fe4e21ecae/model/gen-ai/registry.yaml#L658
func isEmbeddings(attributes map[string]any) bool {
	switch strings.ToLower(stringOf(attribute(attributes, GenAIOperationName))) {
	case "embeddings", "embedding":
		return true
	}
	return strings.HasPrefix(stringOf(attribute(attributes, vercelOperation)), "ai.embed")
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
		f.out.Input = inputMessages(msgs)
	}
	if output := attribute(f.attributes, GenAIOutputMessages); output != nil {
		f.out.Output, outputLabel = f.side(decode(output), RoleAssistant)
		f.completionToolCalls()
	}
	f.warnMixedFormats(inputLabel, outputLabel)
}

// OpenRouter's answer object or an Anthropic response beside the OpenAI chat request it answers is one
// format, not a mix: an Anthropic request without system and without Anthropic-only blocks reads as an
// OpenAI chat request. A side kept as generic already warned, and a side read from OpenInference's
// buckets beside the raw payload of the other is the documented fallback.
func (f *formatting) warnMixedFormats(inputLabel, outputLabel string) {
	switch {
	case inputLabel == "" || outputLabel == "" || outputLabel == inputLabel:
	case inputLabel == FormatterGeneric || outputLabel == FormatterGeneric:
	case inputLabel == FormatterOpenInference || outputLabel == FormatterOpenInference:
	case inputLabel == FormatterOpenAIChat && (outputLabel == FormatterOpenRouter || outputLabel == FormatterAnthropic):
	default:
		f.warn("output formatted as %s, input as %s", outputLabel, inputLabel)
	}
}

// prependSystemInstructions adds gen_ai.system_instructions, a list of parts, as a leading system message,
// unless the input already starts with a system message of the same text: the OpenInference strands
// processor keeps the attribute and inserts it as message 0 as well. A span without messages, such as
// create_agent, stays without them.
// https://github.com/open-telemetry/semantic-conventions-genai/blob/06ec68e722c45a7218e23ea1bc1339fe4e21ecae/model/gen-ai/gen-ai-system-instructions.json
// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-strands-agents/src/openinference/instrumentation/strands_agents/processor.py#L152
// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/python/instrumentation/openinference-instrumentation-strands-agents/src/openinference/instrumentation/strands_agents/processor.py#L293
func (f *formatting) prependSystemInstructions() {
	raw := attribute(f.attributes, GenAISystemInstructions)
	if raw == nil || (len(f.out.Input) == 0 && len(f.out.Output) == 0) {
		return
	}
	parts := systemParts(decode(raw))
	if len(parts) == 0 || (len(f.out.Input) > 0 && f.out.Input[0].Role == RoleSystem && textOf(f.out.Input[0].Parts) == textOf(parts)) {
		return
	}
	f.out.Input = append(InputMessages{{Role: RoleSystem, Parts: parts}}, f.out.Input...)
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
			switch {
			case isGeminiContent(first):
				return f.geminiContents(v), FormatterGemini
			case first["parts"] != nil:
				return f.semconv(v), FormatterSemconv
			case isAnthropicMessages(v):
				return f.anthropicMessages(v), FormatterAnthropic
			case isResponsesItems(v):
				return foldAssistant(f.responsesItems(v)), FormatterOpenAIResponses
			case first["role"] != nil:
				return f.openAIChatMessages(v), FormatterOpenAIChat
			}
		}
	case map[string]any:
		if inner, ok := superJSON(v); ok {
			return f.side(decode(inner), role)
		}
		switch {
		case isLangChainRun(v):
			return f.langChainRun(v), FormatterLangChain
		case isOpenRouterCompletion(v):
			return f.openRouterCompletion(v), FormatterOpenRouter
		case isResponsesResponse(v):
			return f.responsesResponse(v), FormatterOpenAIResponses
		case isResponsesRequest(v):
			return f.responsesRequest(v), FormatterOpenAIResponses
		case isAnthropicResponse(v):
			return f.anthropicResponse(v), FormatterAnthropic
		case isAnthropicRequest(v):
			return f.anthropicRequest(v), FormatterAnthropic
		case isGeminiResponse(v):
			return f.geminiResponse(v), FormatterGemini
		case isGeminiRequest(v):
			return f.geminiRequest(v), FormatterGemini
		case isGeminiContent(v):
			return OutputMessages{geminiContent(v, role)}, FormatterGemini
		}
		if choices, ok := v["choices"].([]any); ok {
			return f.openAIChatResponse(choices), FormatterOpenAIChat
		}
		if messages, ok := v["messages"].([]any); ok {
			return f.openAIChatMessages(messages), FormatterOpenAIChat
		}
		if (v["role"] != nil && hasKeys(v, "content")) || v["tool_calls"] != nil {
			return OutputMessages{f.openAIChatSingle(v)}, FormatterOpenAIChat
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
			out[len(out)-1].Parts = append(out[len(out)-1].Parts, msg.Parts...)
			continue
		}
		if len(msg.Parts) == 0 {
			continue
		}
		out = append(out, msg)
	}
	return out
}

// superJSON unwraps {json, meta?}, the envelope superjson, the transformer tRPC apps serialise with,
// puts around a value; a Langfuse generation records it around the request when the app passes the
// serialised form:
// https://github.com/flightcontrolhq/superjson/blob/aaa65e36e8e31da740265a56b27c965ca1c7b754/README.md
func superJSON(m map[string]any) (any, bool) {
	inner, ok := m["json"]
	if !ok {
		return nil, false
	}
	for key := range m {
		if key != "json" && key != "meta" {
			return nil, false
		}
	}
	return inner, true
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

func hasToolCall(parts Parts) bool {
	for _, p := range parts {
		if _, ok := p.Value.(ToolCallRequestPart); ok {
			return true
		}
	}
	return false
}

func onlyText(parts Parts) bool {
	for _, p := range parts {
		if _, ok := p.Value.(TextPart); !ok {
			return false
		}
	}
	return true
}

// textOf joins the text parts, for comparing a system message with gen_ai.system_instructions.
func textOf(parts Parts) string {
	var texts []string
	for _, p := range parts {
		if t, ok := p.Value.(TextPart); ok {
			texts = append(texts, t.Content)
		}
	}
	return strings.Join(texts, "\n")
}

// splitToolResults moves tool_call_response parts out of a message into a tool message before it,
// for APIs that carry tool results inside the next user turn.
func splitToolResults(msg OutputMessage) OutputMessages {
	results, rest := Parts{}, Parts{}
	for _, p := range msg.Parts {
		if _, ok := p.Value.(ToolCallResponsePart); ok {
			results = append(results, p)
		} else {
			rest = append(rest, p)
		}
	}
	if len(results) == 0 {
		return OutputMessages{msg}
	}
	out := OutputMessages{{Role: RoleTool, Parts: results}}
	if len(rest) > 0 {
		msg.Parts = rest
		out = append(out, msg)
	}
	return out
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

// contentPart converts one content block in the OpenAI Chat Completions or Responses spelling, which
// semconv parts may also carry; a text part in the semconv spelling has content where OpenAI has text.
// A block of any other type is kept as sent.
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L53827
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L57589
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

// mediaPart places a data URL in a BlobPart and any other URL in a UriPart. A value without a URL scheme,
// such as a redaction placeholder, is kept as media without a URL.
func mediaPart(url string, modality Modality) any {
	if m := dataURL.FindStringSubmatch(url); m != nil {
		return BlobPart{Type: PartTypeBlob, Modality: modality, MimeType: &m[1], Content: m[2]}
	}
	if !urlScheme.MatchString(url) {
		return mediaWithoutURL{"type": FormatterGeneric, "modality": modality.StringValue(), "content": url}
	}
	return UriPart{Type: PartTypeURI, Modality: modality, URI: url}
}

// mediaWithoutURL is a generic part that FormatMessages warns about once the converters ran.
type mediaWithoutURL GenericPart

// genericMedia turns media without a URL into generic parts, with one warning.
func (f *formatting) genericMedia() {
	found := false
	for i := range f.out.Input {
		found = genericMediaParts(f.out.Input[i].Parts) || found
	}
	for i := range f.out.Output {
		found = genericMediaParts(f.out.Output[i].Parts) || found
	}
	if found {
		f.warn("media without a URL kept as generic")
	}
}

func genericMediaParts(parts Parts) bool {
	found := false
	for i, p := range parts {
		if media, ok := p.Value.(mediaWithoutURL); ok {
			parts[i] = part(GenericPart(media))
			found = true
		}
	}
	return found
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
