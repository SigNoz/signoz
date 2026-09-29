package genaimessages

import (
	"cmp"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// convertSemconvMessages handles [{role, parts, finish_reason}] and Gemini contents.
func convertSemconvMessages(value any) ([]aiobservabilitytypes.Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	first, ok := list[0].(map[string]any)
	if !ok {
		return nil, false
	}
	if _, ok := first["parts"]; !ok {
		return nil, false
	}

	messages := make([]aiobservabilitytypes.Message, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		if !ok {
			messages = append(messages, genericMessages(stringOf(item))[0])
			continue
		}
		messages = append(messages, semconvMessage(m, "")...)
	}
	return messages, true
}

// semconvMessage falls back to chatMessage when m has no parts.
func semconvMessage(m map[string]any, defaultRole aiobservabilitytypes.MessageRole) []aiobservabilitytypes.Message {
	parts, ok := m["parts"].([]any)
	if !ok {
		return chatMessage(m, defaultRole)
	}
	role := cmp.Or(normalizeRole(stringOf(m["role"])), defaultRole)
	msg := aiobservabilitytypes.Message{
		Role:         role,
		Content:      []aiobservabilitytypes.Part{},
		FinishReason: normalizeFinishReason(finishReasonOf(m)),
	}
	for _, p := range parts {
		msg.Content = append(msg.Content, semconvPart(p))
	}
	return []aiobservabilitytypes.Message{msg}
}

func semconvPart(value any) aiobservabilitytypes.Part {
	p, ok := value.(map[string]any)
	if !ok {
		if s, ok := value.(string); ok {
			return textPart(s)
		}
		return genericPart(value)
	}
	switch stringOf(p["type"]) {
	case "text":
		if boolOf(p["thought"]) {
			return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(firstOf(p, "content", "text"))}
		}
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeText, Content: stringOf(firstOf(p, "content", "text"))}
	case "reasoning", "thinking":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(firstOf(p, "content", "thinking", "text"))}
	case "redacted_thinking", "redacted_reasoning":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Redacted: true}
	case "tool_call":
		return aiobservabilitytypes.Part{
			Type:      aiobservabilitytypes.PartTypeToolCall,
			ID:        toolCallID(p["id"]),
			Name:      stringOf(p["name"]),
			Arguments: parseArguments(firstOf(p, "arguments", "args", "input")),
			Server:    boolOf(p["server"]),
		}
	case "tool_call_response":
		return aiobservabilitytypes.Part{
			Type:       aiobservabilitytypes.PartTypeToolResult,
			ToolCallID: toolCallID(p["id"]),
			Name:       stringOf(p["name"]),
			Content:    stringOf(firstOf(p, "response", "result", "content", "output")),
			IsError:    boolOf(firstOf(p, "is_error", "isError")),
			Server:     boolOf(p["server"]),
		}
	case "":
		// Gemini parts carry no type; the field name is the type.
		if text, ok := p["text"]; ok {
			if boolOf(p["thought"]) {
				return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(text)}
			}
			return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeText, Content: stringOf(text)}
		}
		if call, ok := firstOf(p, "functionCall", "function_call").(map[string]any); ok {
			return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolCall, ID: stringOf(call["id"]), Name: stringOf(call["name"]), Arguments: parseArguments(call["args"])}
		}
		if resp, ok := firstOf(p, "functionResponse", "function_response").(map[string]any); ok {
			return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: stringOf(resp["id"]), Name: stringOf(resp["name"]), Content: stringOf(resp["response"])}
		}
	}
	return genericPart(p)
}
