package genaimessages

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// isResponsesItemType matches role-less Responses API tool and MCP items.
func isResponsesItemType(typ string) bool {
	switch typ {
	case "":
		return false
	case "function_call", "function_call_output", "tool_call", "custom_tool_call", "custom_tool_call_output",
		"mcp_call", "mcp_list_tools", "mcp_approval_request", "mcp_approval_response":
		return true
	}
	return strings.HasSuffix(typ, "_call") || strings.HasSuffix(typ, "_call_output")
}

// responsesItemMessages maps built-in tools to server tool parts.
func responsesItemMessages(m map[string]any, typ string) []aiobservabilitytypes.Message {
	switch typ {
	case "function_call", "tool_call", "custom_tool_call":
		return []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{{
			Type:      aiobservabilitytypes.PartTypeToolCall,
			ID:        stringOf(firstOf(m, "call_id", "id")),
			Name:      stringOf(m["name"]),
			Arguments: parseArguments(firstOf(m, "arguments", "args", "input")),
		}}}}
	case "function_call_output", "custom_tool_call_output":
		return []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleTool, Content: []aiobservabilitytypes.Part{{
			Type:       aiobservabilitytypes.PartTypeToolResult,
			ToolCallID: stringOf(firstOf(m, "call_id", "id")),
			Content:    stringOf(firstOf(m, "output", "result")),
		}}}}
	}

	id := stringOf(firstOf(m, "call_id", "id"))
	if strings.HasSuffix(typ, "_output") || typ == "mcp_approval_response" {
		return []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleTool, Content: []aiobservabilitytypes.Part{{
			Type:       aiobservabilitytypes.PartTypeToolResult,
			ToolCallID: id,
			Name:       strings.TrimSuffix(typ, "_output"),
			Content:    stringOf(firstOf(m, "output", "result", "results")),
			Server:     true,
		}}}}
	}

	args := make(map[string]any, len(m))
	for k, v := range m {
		switch k {
		case "type", "id", "call_id", "status", "name", "server_label", "output", "result", "results":
		default:
			args[k] = v
		}
	}
	name := stringOf(firstOf(m, "name", "server_label"))
	if name == "" {
		name = typ
	}
	call := aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolCall, ID: id, Name: name, Server: true}
	if len(args) > 0 {
		call.Arguments = args
	}
	msg := aiobservabilitytypes.Message{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{call}}
	if result := firstOf(m, "output", "result", "results"); result != nil {
		msg.Content = append(msg.Content, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: id, Name: name, Content: stringOf(result), Server: true})
	}
	return []aiobservabilitytypes.Message{msg}
}

// reasoningParts marks encrypted reasoning without a summary as redacted.
func reasoningParts(m map[string]any) []aiobservabilitytypes.Part {
	parts := []aiobservabilitytypes.Part{}
	if summary, ok := m["summary"].([]any); ok {
		for _, s := range summary {
			parts = append(parts, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(firstOf(asMap(s), "text", "content"))})
		}
	}
	if content, ok := m["content"].([]any); ok {
		for _, c := range content {
			parts = append(parts, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(firstOf(asMap(c), "text", "content"))})
		}
	}
	if len(parts) == 0 {
		parts = append(parts, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Redacted: true})
	}
	return parts
}

func convertResponsesAPIResponse(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	output, ok := m["output"].([]any)
	if !ok {
		return nil, false
	}
	messages := make([]aiobservabilitytypes.Message, 0, len(output))
	for _, item := range output {
		messages = append(messages, chatMessage(item, aiobservabilitytypes.MessageRoleAssistant)...)
	}
	if len(messages) == 0 {
		return messages, true
	}
	last := &messages[len(messages)-1]
	if last.FinishReason == "" {
		if details, ok := m["incomplete_details"].(map[string]any); ok {
			last.FinishReason = normalizeFinishReason(stringOf(details["reason"]))
		} else if stringOf(m["status"]) == "completed" {
			last.FinishReason = aiobservabilitytypes.FinishReasonStop
		}
	}
	return messages, true
}
