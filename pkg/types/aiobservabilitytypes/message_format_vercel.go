package aiobservabilitytypes

import (
	"encoding/base64"
	"strings"
)

// Format: the Vercel AI SDK telemetry attributes (https://ai-sdk.dev/docs/ai-sdk-core/telemetry):
// ai.prompt.messages, the provider prompt (vercel/ai@6617f11, packages/provider/src/language-model/
// v2/language-model-v2-prompt.ts; v1 spelled tool-call args and tool-result result), ai.prompt on the
// parent span ({system, prompt} or {messages}), ai.response.text and ai.response.toolCalls. The span
// mapper moves ai.prompt.messages and one of the response keys onto gen_ai.*.messages; the other
// response key is read where it is.
// Written by: Vercel AI SDK, Mastra.
// Handled: text, reasoning, tool-call, tool-result (v1 and v2 spellings), image and file parts as
// data URL, URL, bare base64 or a serialised Buffer; ai.response.finishReason.

const (
	vercelPrompt           = "ai.prompt"
	vercelOperation        = "ai.operationId"
	vercelResponseText     = "ai.response.text"
	vercelResponseCalls    = "ai.response.toolCalls"
	vercelResponseFinished = "ai.response.finishReason"
)

func (f *formatting) vercel() bool {
	if f.attr(vercelOperation) == nil && f.attr(vercelPrompt) == nil && f.attr("ai.response") == nil {
		return false
	}
	switch input := decode(f.attr(GenAIInputMessages)).(type) {
	case []any:
		f.out.Input = inputMessages(f.vercelMessages(input))
	case nil:
		if prompt, ok := decode(f.attr(vercelPrompt)).(map[string]any); ok {
			f.out.Input = inputMessages(f.vercelPrompt(prompt))
		}
	default:
		f.out.Input = inputMessages(OutputMessages{genericMessage(input)})
		f.warn("input is not a message list, kept as generic")
	}

	text, calls := f.attr(vercelResponseText), decode(f.attr(vercelResponseCalls))
	switch output := decode(f.attr(GenAIOutputMessages)).(type) {
	case string:
		text = output
	case []any:
		calls = output
	}
	msg := OutputMessage{Role: RoleAssistant, Parts: Parts{}, FinishReason: finishReason(stringOf(f.attr(vercelResponseFinished)))}
	if s := stringOf(text); s != "" {
		msg.Parts = append(msg.Parts, part(textPart(s)))
	}
	if list, ok := calls.([]any); ok {
		for _, item := range list {
			if call, ok := item.(map[string]any); ok {
				msg.Parts = append(msg.Parts, vercelToolCall(call))
			}
		}
	}
	if len(msg.Parts) > 0 {
		f.out.Output = OutputMessages{msg}
	}
	f.out.Formatter = FormatterVercel
	return true
}

// vercelPrompt reads the parent span's ai.prompt: the system prompt with either a bare prompt or
// the messages.
func (f *formatting) vercelPrompt(prompt map[string]any) OutputMessages {
	var msgs OutputMessages
	if system := systemMessage(prompt["system"]); system != nil {
		msgs = append(msgs, *system)
	}
	if messages, ok := prompt["messages"].([]any); ok {
		return append(msgs, f.vercelMessages(messages)...)
	}
	if text := stringOf(prompt["prompt"]); text != "" {
		msgs = append(msgs, OutputMessage{Role: RoleUser, Parts: Parts{part(textPart(text))}})
	}
	return msgs
}

func (f *formatting) vercelMessages(list []any) OutputMessages {
	out := make(OutputMessages, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		if !ok {
			out = append(out, genericMessage(item))
			continue
		}
		msg := OutputMessage{Role: role(stringOf(m["role"])), Parts: Parts{}}
		switch content := m["content"].(type) {
		case string:
			if content != "" {
				msg.Parts = append(msg.Parts, part(textPart(content)))
			}
		case []any:
			for _, item := range content {
				msg.Parts = append(msg.Parts, vercelPart(item))
			}
		}
		out = append(out, msg)
	}
	return out
}

func vercelPart(item any) Part {
	p, ok := item.(map[string]any)
	if !ok {
		return contentPart(item)
	}
	switch stringOf(p["type"]) {
	case "text":
		return part(textPart(stringOf(p["text"])))
	case "reasoning":
		return part(ReasoningPart{Type: PartTypeReasoning, Content: stringOf(p["text"])})
	case "redacted-reasoning":
		return part(ReasoningPart{Type: PartTypeReasoning})
	case "tool-call":
		return vercelToolCall(p)
	case "tool-result":
		response := p["result"]
		if output, ok := p["output"].(map[string]any); ok {
			response = output["value"]
		}
		return part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: optionalString(p["toolCallId"]), Response: response})
	case "image":
		mime := stringOf(p["mimeType"])
		if mime == "" {
			mime = stringOf(p["mediaType"])
		}
		if media, ok := vercelMedia(p["image"], mime, ModalityImage); ok {
			return media
		}
	case "file":
		mime := stringOf(p["mediaType"])
		if mime == "" {
			mime = stringOf(p["mimeType"])
		}
		if media, ok := vercelMedia(p["data"], mime, modalityOf(mime)); ok {
			return media
		}
	}
	return part(GenericPart(p))
}

// vercelToolCall reads {toolCallId, toolName, input} or the v1 {toolCallId, toolName, args}; the
// arguments may be a JSON string.
func vercelToolCall(call map[string]any) Part {
	args := call["input"]
	if args == nil {
		args = call["args"]
	}
	return part(ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(call["toolName"]), ID: optionalString(call["toolCallId"]), Arguments: decode(args)})
}

// vercelMedia reads a data URL, a URL, bare base64 or a serialised Node Buffer {type: Buffer,
// data: [bytes]}.
func vercelMedia(value any, mimeType string, modality Modality) (Part, bool) {
	switch v := value.(type) {
	case string:
		if v == "" {
			return Part{}, false
		}
		if strings.Contains(v, "://") || strings.HasPrefix(v, "data:") {
			return part(mediaPart(v, modality)), true
		}
		return part(BlobPart{Type: PartTypeBlob, Modality: modality, Content: v, MimeType: optionalString(mimeType)}), true
	case map[string]any:
		bytes, ok := v["data"].([]any)
		if !ok {
			return Part{}, false
		}
		raw := make([]byte, 0, len(bytes))
		for _, b := range bytes {
			n, _ := b.(float64)
			raw = append(raw, byte(n))
		}
		return part(BlobPart{Type: PartTypeBlob, Modality: modality, Content: base64.StdEncoding.EncodeToString(raw), MimeType: optionalString(mimeType)}), true
	}
	return Part{}, false
}
