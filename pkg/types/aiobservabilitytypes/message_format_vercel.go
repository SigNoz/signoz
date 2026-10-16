package aiobservabilitytypes

import (
	"encoding/base64"
	"strings"
)

// Format: the AI SDK's legacy telemetry attributes. ai.prompt.messages on the doGenerate and doStream
// spans is the provider prompt, ai.prompt on the parent generateText and streamText spans is {system,
// prompt} or {messages}, ai.response.text and ai.response.toolCalls hold the answer:
// https://ai-sdk.dev/docs/ai-sdk-core/telemetry
// The prompt parts in the provider's v1 spelling, image with mimeType, tool-call args and tool-result
// result, or v2, file with mediaType, tool-call input and tool-result output:
// https://github.com/vercel/ai/blob/47bd16dd50283c82a5fef4c839d7f4102c45f5b9/packages/provider/src/language-model/v1/language-model-v1-prompt.ts#L120
// https://github.com/vercel/ai/blob/a5e92fe3c692f8e152fe1eb9ef50a4e734ad0ffb/packages/provider/src/language-model/v2/language-model-v2-prompt.ts#L93
// The span mapper moves ai.prompt.messages and one of the response keys onto gen_ai.*.messages; the other
// response key and ai.prompt are read where they are.
// Written by: the Vercel AI SDK, Mastra.
// Handled: text, reasoning, tool-call, tool-result, image and file parts as a data URL, a URL, bare base64
// or a serialised Buffer; ai.response.finishReason.

const (
	vercelPrompt           = "ai.prompt"
	vercelOperation        = "ai.operationId"
	vercelResponseText     = "ai.response.text"
	vercelResponseCalls    = "ai.response.toolCalls"
	vercelResponseFinished = "ai.response.finishReason"
)

func (f *formatting) vercel() bool {
	if attribute(f.attributes, vercelOperation) == nil && attribute(f.attributes, vercelPrompt) == nil && attribute(f.attributes, "ai.response") == nil {
		return false
	}
	switch input := decode(attribute(f.attributes, GenAIInputMessages)).(type) {
	case []any:
		f.out.Input = inputMessages(vercelMessages(input))
	case nil:
		if prompt, ok := decode(attribute(f.attributes, vercelPrompt)).(map[string]any); ok {
			f.out.Input = inputMessages(vercelParentPrompt(prompt))
		}
	default:
		f.out.Input = inputMessages(OutputMessages{genericMessage(input)})
		f.warn("input is not a message list, kept as generic")
	}

	text, calls := attribute(f.attributes, vercelResponseText), decode(attribute(f.attributes, vercelResponseCalls))
	switch output := decode(attribute(f.attributes, GenAIOutputMessages)).(type) {
	case string:
		text = output
	case []any:
		calls = output
	}
	msg := OutputMessage{Role: RoleAssistant, Parts: Parts{}, FinishReason: finishReason(stringOf(attribute(f.attributes, vercelResponseFinished)))}
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
	return true
}

// vercelParentPrompt reads the parent span's ai.prompt: the system prompt with either a bare prompt or
// the messages.
func vercelParentPrompt(prompt map[string]any) OutputMessages {
	var msgs OutputMessages
	if parts := systemParts(prompt["system"]); len(parts) > 0 {
		msgs = append(msgs, OutputMessage{Role: RoleSystem, Parts: parts})
	}
	if messages, ok := prompt["messages"].([]any); ok {
		return append(msgs, vercelMessages(messages)...)
	}
	if text := stringOf(prompt["prompt"]); text != "" {
		msgs = append(msgs, OutputMessage{Role: RoleUser, Parts: Parts{part(textPart(text))}})
	}
	return msgs
}

func vercelMessages(list []any) OutputMessages {
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
// arguments may be a JSON string:
// https://github.com/vercel/ai/blob/a5e92fe3c692f8e152fe1eb9ef50a4e734ad0ffb/packages/provider/src/language-model/v2/language-model-v2-prompt.ts#L126
// https://github.com/vercel/ai/blob/47bd16dd50283c82a5fef4c839d7f4102c45f5b9/packages/provider/src/language-model/v1/language-model-v1-prompt.ts#L175
func vercelToolCall(call map[string]any) Part {
	args := call["input"]
	if args == nil {
		args = call["args"]
	}
	return part(ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(call["toolName"]), ID: optionalString(call["toolCallId"]), Arguments: decode(args)})
}

// vercelMedia reads a data URL, a URL, bare base64 or a serialised Node Buffer {type: Buffer,
// data: [bytes]}, which is how the parent span's ai.prompt carries an image given as bytes.
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
