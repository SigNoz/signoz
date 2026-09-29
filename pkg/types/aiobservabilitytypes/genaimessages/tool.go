package genaimessages

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// convertToolCallList handles a bare tool call list, e.g. Vercel ai.response.toolCalls.
func convertToolCallList(value any) ([]aiobservabilitytypes.Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	msg := aiobservabilitytypes.Message{Role: aiobservabilitytypes.MessageRoleAssistant, Content: make([]aiobservabilitytypes.Part, 0, len(list))}
	for _, item := range list {
		call, ok := item.(map[string]any)
		if !ok || !isToolCall(call) {
			return nil, false
		}
		msg.Content = append(msg.Content, toolCallPart(call))
	}
	return []aiobservabilitytypes.Message{msg}, true
}

// isToolCall rejects tool definitions, which carry no arguments.
func isToolCall(call map[string]any) bool {
	if _, has := call["toolName"]; has {
		return true
	}
	if fn, ok := call["function"].(map[string]any); ok {
		_, has := fn["arguments"]
		return has
	}
	if _, has := call["name"]; !has {
		return false
	}
	_, has := lookup(call, "arguments", "args")
	return has
}

// toolCallPart reads the OpenAI, flat, Anthropic and Vercel tool call shapes.
func toolCallPart(value any) aiobservabilitytypes.Part {
	call, ok := value.(map[string]any)
	if !ok {
		return genericPart(value)
	}
	part := aiobservabilitytypes.Part{
		Type: aiobservabilitytypes.PartTypeToolCall,
		ID:   toolCallID(firstOf(call, "toolCallId", "call_id", "id")),
		Name: stringOf(firstOf(call, "toolName", "name")),
	}
	if fn, ok := call["function"].(map[string]any); ok {
		part.Name = stringOf(fn["name"])
		part.Arguments = parseArguments(fn["arguments"])
		return part
	}
	part.Arguments = parseArguments(firstOf(call, "arguments", "args", "input"))
	return part
}

// toolResultBlockPart unwraps the Vercel {type, value} result wrapper.
func toolResultBlockPart(p map[string]any, result any, server bool) aiobservabilitytypes.Part {
	if nested, ok := result.(map[string]any); ok && len(nested) <= 2 {
		if v, ok := nested["value"]; ok {
			result = v
		}
	}
	return aiobservabilitytypes.Part{
		Type:       aiobservabilitytypes.PartTypeToolResult,
		ToolCallID: toolCallID(firstOf(p, "toolCallId", "tool_use_id", "tool_call_id", "call_id", "id")),
		Name:       stringOf(firstOf(p, "toolName", "name")),
		Content:    toolResultText(result),
		IsError:    boolOf(firstOf(p, "isError", "is_error")),
		Server:     server,
	}
}

// toolResultText joins a list of text blocks; anything else goes through stringOf.
func toolResultText(result any) string {
	list, ok := result.([]any)
	if !ok || len(list) == 0 {
		return stringOf(result)
	}
	texts := make([]string, 0, len(list))
	for _, item := range list {
		block := asMap(item)
		text, ok := block["text"].(string)
		if !ok || (len(block) == 2 && stringOf(block["type"]) != "text") || len(block) > 2 {
			return stringOf(result)
		}
		texts = append(texts, text)
	}
	return strings.Join(texts, "\n")
}

// toolCallID picks the call_ entry, else the last, from list ids such as ["run_id", "call_id"].
func toolCallID(value any) string {
	list, ok := value.([]any)
	if !ok {
		return stringOf(value)
	}
	if len(list) == 0 {
		return ""
	}
	for _, item := range list {
		if s, ok := item.(string); ok && strings.HasPrefix(s, "call_") {
			return s
		}
	}
	return stringOf(list[len(list)-1])
}
