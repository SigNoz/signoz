package aiobservabilitytypes

import "strings"

// Format: Anthropic Messages, a request {system, messages} or a response {content, stop_reason}:
// https://platform.claude.com/docs/en/api/messages
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/message_create_params.py#L181
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/message_param.py#L28
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/message.py#L91
// Written by: gateways recording raw Anthropic bodies. OpenInference flattens these into
// llm.*_messages, which take precedence.
// Handled: string and block content; text, image and document sources of every type, tool_use,
// tool_result, thinking, redacted_thinking, server_tool_use and the *_tool_result blocks. A tool_result
// inside a user turn becomes a tool message before it.
// Not yet: a request without system and without Anthropic-only blocks is indistinguishable from an
// OpenAI chat request and formats as one.

// Block types only the Messages API has, which tell its message list from an OpenAI chat one:
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/tool_use_block_param.py#L23
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/thinking_block_param.py#L21
var anthropicBlockTypes = map[string]bool{
	"tool_use": true, "tool_result": true, "thinking": true, "redacted_thinking": true, "server_tool_use": true, "document": true,
}

func isAnthropicRequest(m map[string]any) bool {
	messages, ok := m["messages"].([]any)
	if !ok {
		return false
	}
	return m["system"] != nil || isAnthropicMessages(messages)
}

func isAnthropicResponse(m map[string]any) bool {
	if _, ok := m["content"].([]any); !ok {
		return false
	}
	_, hasStop := m["stop_reason"]
	return hasStop || stringOf(m["type"]) == "message"
}

func isAnthropicMessages(list []any) bool {
	for _, item := range list {
		m, _ := item.(map[string]any)
		blocks, _ := m["content"].([]any)
		for _, block := range blocks {
			b, _ := block.(map[string]any)
			typ := stringOf(b["type"])
			if anthropicBlockTypes[typ] || strings.HasSuffix(typ, "_tool_result") || (typ == "image" && b["source"] != nil) {
				return true
			}
		}
	}
	return false
}

func (f *formatting) anthropicRequest(m map[string]any) OutputMessages {
	messages, _ := m["messages"].([]any)
	msgs := f.anthropicMessages(messages)
	if parts := systemParts(m["system"]); len(parts) > 0 {
		return append(OutputMessages{{Role: RoleSystem, Parts: parts}}, msgs...)
	}
	return msgs
}

func (f *formatting) anthropicMessages(list []any) OutputMessages {
	out := make(OutputMessages, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		if !ok {
			out = append(out, genericMessage(item))
			continue
		}
		msg := OutputMessage{Role: role(stringOf(m["role"])), Parts: anthropicContent(m["content"])}
		out = append(out, splitToolResults(msg)...)
	}
	return out
}

// anthropicResponse is one assistant message with the stop reason.
func (f *formatting) anthropicResponse(m map[string]any) OutputMessages {
	msg := OutputMessage{Role: role(stringOf(m["role"])), Parts: anthropicContent(m["content"]), FinishReason: finishReason(stringOf(m["stop_reason"]))}
	if msg.Role.IsZero() {
		msg.Role = RoleAssistant
	}
	return OutputMessages{msg}
}

func anthropicContent(content any) Parts {
	parts := Parts{}
	switch v := content.(type) {
	case string:
		if v != "" {
			parts = append(parts, part(textPart(v)))
		}
	case []any:
		for _, item := range v {
			if b, ok := item.(map[string]any); ok {
				parts = append(parts, anthropicBlock(b))
			} else {
				parts = append(parts, contentPart(item))
			}
		}
	}
	return parts
}

// anthropicBlock converts one content block:
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/tool_result_block_param.py#L29
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/redacted_thinking_block_param.py#L15
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/server_tool_use_block_param.py#L33
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/web_search_tool_result_block_param.py#L22
func anthropicBlock(b map[string]any) Part {
	typ := stringOf(b["type"])
	switch {
	case typ == "text":
		return part(textPart(stringOf(b["text"])))
	case typ == "image" || typ == "document":
		return anthropicSource(b, typ)
	case typ == "tool_use":
		return part(ToolCallRequestPart{Type: PartTypeToolCall, ID: optionalString(b["id"]), Name: stringOf(b["name"]), Arguments: b["input"]})
	case typ == "tool_result":
		return part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: optionalString(b["tool_use_id"]), Response: toolResponse(b["content"])})
	case typ == "thinking":
		return part(ReasoningPart{Type: PartTypeReasoning, Content: stringOf(b["thinking"])})
	case typ == "redacted_thinking":
		return part(ReasoningPart{Type: PartTypeReasoning})
	case typ == "server_tool_use":
		return part(ServerToolCallPart{Type: PartTypeServerToolCall, ID: optionalString(b["id"]), Name: stringOf(b["name"]), ServerToolCall: GenericServerToolCall(b)})
	case strings.HasSuffix(typ, "_tool_result"):
		return part(ServerToolCallResponsePart{Type: PartTypeServerToolCallResponse, ID: optionalString(b["tool_use_id"]), ServerToolCallResponse: GenericServerToolCallResponse(b)})
	}
	return part(GenericPart(b))
}

// anthropicSource reads the {source: {type: base64|url|file|text, ...}} of an image or document block:
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/image_block_param.py#L14
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/document_block_param.py#L16
func anthropicSource(b map[string]any, typ string) Part {
	source, _ := b["source"].(map[string]any)
	mime := optionalString(source["media_type"])
	modality := ModalityDocument
	if typ == "image" {
		modality = ModalityImage
	}
	switch stringOf(source["type"]) {
	case "base64":
		return part(BlobPart{Type: PartTypeBlob, Modality: modality, MimeType: mime, Content: stringOf(source["data"])})
	case "url":
		return part(UriPart{Type: PartTypeURI, Modality: modality, MimeType: mime, URI: stringOf(source["url"])})
	case "file":
		return part(FilePart{Type: PartTypeFile, Modality: modality, MimeType: mime, FileID: stringOf(source["file_id"])})
	case "text":
		return part(textPart(stringOf(source["data"])))
	}
	return part(GenericPart(b))
}
