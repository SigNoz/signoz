package genaimessages

import (
	"cmp"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// chatMessage returns nil for LangGraph tool definitions.
func chatMessage(value any, defaultRole aiobservabilitytypes.MessageRole) []aiobservabilitytypes.Message {
	m, ok := toObject(value)
	if !ok {
		return genericMessages(stringOf(value))
	}
	if inner, role, ok := langChainMessage(m); ok {
		return chatMessage(inner, role)
	}
	if isLangGraphToolDefinition(m) {
		return nil
	}

	typ := m.str("type")
	if isResponsesItemType(typ) {
		return responsesItemMessages(m, typ)
	}
	if typ == "reasoning" {
		return []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleAssistant, Content: reasoningParts(m)}}
	}

	role := cmp.Or(normalizeRole(m.str("role")), standardRole(typ), defaultRole)
	msg := aiobservabilitytypes.Message{
		Role:         role,
		Content:      append(messageContentParts(m, role), messageToolCallParts(m)...),
		FinishReason: normalizeFinishReason(finishReasonOf(m)),
	}
	if refusal := m.str("refusal"); refusal != "" {
		msg.Content = append(msg.Content, textPart(refusal))
	}
	return []aiobservabilitytypes.Message{msg}
}

// langChainMessage unwraps a serialised message: {lc, type: "constructor", id: [..., "HumanMessage"], kwargs}.
func langChainMessage(m object) (object, aiobservabilitytypes.MessageRole, bool) {
	kwargs, ok := m.obj("kwargs")
	if !ok || m.str("type") != "constructor" {
		return nil, "", false
	}
	return kwargs, cmp.Or(langChainRole(m.at("id")), standardRole(kwargs.str("type"))), true
}

func langChainRole(id any) aiobservabilitytypes.MessageRole {
	path, ok := id.([]any)
	if !ok || len(path) == 0 {
		return ""
	}
	switch class := stringOf(lastItem(path)); {
	case strings.HasPrefix(class, "System"):
		return aiobservabilitytypes.MessageRoleSystem
	case strings.HasPrefix(class, "Human"):
		return aiobservabilitytypes.MessageRoleUser
	case strings.HasPrefix(class, "AI"):
		return aiobservabilitytypes.MessageRoleAssistant
	case strings.HasPrefix(class, "Tool"), strings.HasPrefix(class, "Function"):
		return aiobservabilitytypes.MessageRoleTool
	}
	return ""
}

// isLangGraphToolDefinition matches {role: "tool", content: {type: "function"}} without tool_call_id.
func isLangGraphToolDefinition(m object) bool {
	if normalizeRole(m.str("role")) != aiobservabilitytypes.MessageRoleTool {
		return false
	}
	if has := m.has("tool_call_id"); has {
		return false
	}
	content, ok := m.obj("content")
	if !ok || content.str("type") != "function" {
		return false
	}
	ok = content.has("function")
	return ok
}

// messageContentParts turns a tool message's text into its result.
func messageContentParts(m object, role aiobservabilitytypes.MessageRole) []aiobservabilitytypes.Part {
	parts := []aiobservabilitytypes.Part{}
	switch content := m.at("content").(type) {
	case nil:
	case string:
		if role == aiobservabilitytypes.MessageRoleTool {
			parts = append(parts, toolMessageResult(m, content))
		} else if content != "" {
			parts = append(parts, textPart(content))
		}
	case []any:
		for _, item := range content {
			part := contentBlockPart(item)
			if role == aiobservabilitytypes.MessageRoleTool && part.Type == aiobservabilitytypes.PartTypeText {
				part = toolMessageResult(m, part.Content)
			}
			parts = append(parts, part)
		}
	case map[string]any:
		if contentParts, ok := object(content).list("parts"); ok {
			for _, p := range contentParts {
				parts = append(parts, semconvPart(p))
			}
		} else if role == aiobservabilitytypes.MessageRoleTool {
			parts = append(parts, toolMessageResult(m, stringOf(content)))
		} else {
			parts = append(parts, genericPart(content))
		}
	default:
		parts = append(parts, genericPart(content))
	}
	return parts
}

func messageToolCallParts(m object) []aiobservabilitytypes.Part {
	calls, _ := m.first("tool_calls", "toolCalls").([]any)
	if kwargs, ok := m.obj("additional_kwargs"); ok && len(calls) == 0 {
		calls, _ = kwargs.list("tool_calls")
	}
	parts := make([]aiobservabilitytypes.Part, 0, len(calls)+1)
	for _, call := range calls {
		parts = append(parts, toolCallPart(call))
	}
	if call, ok := m.obj("function_call"); ok {
		parts = append(parts, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolCall, Name: call.str("name"), Arguments: parseArguments(call.at("arguments"))})
	}
	return parts
}

func toolMessageResult(m object, content string) aiobservabilitytypes.Part {
	return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: stringOf(m.first("tool_call_id", "toolCallId")), Name: m.str("name"), Content: content}
}

// semconvMessage falls back to chatMessage when m has no parts. LiteLLM mixes in
// OpenAI fields: tool_calls beside parts, and tool_call_id on tool messages.
func semconvMessage(m object, defaultRole aiobservabilitytypes.MessageRole) []aiobservabilitytypes.Message {
	parts, ok := m.list("parts")
	if !ok {
		return chatMessage(m, defaultRole)
	}
	role := cmp.Or(normalizeRole(m.str("role")), defaultRole)
	msg := aiobservabilitytypes.Message{
		Role:         role,
		Content:      []aiobservabilitytypes.Part{},
		FinishReason: normalizeFinishReason(finishReasonOf(m)),
	}
	for _, p := range parts {
		part := semconvPart(p)
		if role == aiobservabilitytypes.MessageRoleTool && part.Type == aiobservabilitytypes.PartTypeText {
			part = toolMessageResult(m, part.Content)
		}
		msg.Content = append(msg.Content, part)
	}
	msg.Content = append(msg.Content, messageToolCallParts(m)...)
	return []aiobservabilitytypes.Message{msg}
}

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

// responsesItemMessages turns a built-in tool item into a call, plus its result when the item carries one.
func responsesItemMessages(m object, typ string) []aiobservabilitytypes.Message {
	switch typ {
	case "function_call", "tool_call", "custom_tool_call":
		return []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{{
			Type:      aiobservabilitytypes.PartTypeToolCall,
			ID:        stringOf(m.first("call_id", "id")),
			Name:      m.str("name"),
			Arguments: parseArguments(m.first("arguments", "args", "input")),
		}}}}
	case "function_call_output", "custom_tool_call_output":
		return []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleTool, Content: []aiobservabilitytypes.Part{{
			Type:       aiobservabilitytypes.PartTypeToolResult,
			ToolCallID: stringOf(m.first("call_id", "id")),
			Content:    stringOf(m.first("output", "result")),
		}}}}
	}

	id := stringOf(m.first("call_id", "id"))
	if strings.HasSuffix(typ, "_output") || typ == "mcp_approval_response" {
		return []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleTool, Content: []aiobservabilitytypes.Part{{
			Type:       aiobservabilitytypes.PartTypeToolResult,
			ToolCallID: id,
			Name:       strings.TrimSuffix(typ, "_output"),
			Content:    stringOf(m.first("output", "result", "results")),
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
	name := stringOf(m.first("name", "server_label"))
	if name == "" {
		name = typ
	}
	call := aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolCall, ID: id, Name: name}
	if arguments, ok := m.get("arguments"); ok {
		call.Arguments = parseArguments(arguments)
	} else if len(args) > 0 {
		call.Arguments = args
	}
	msg := aiobservabilitytypes.Message{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{call}}
	if result := m.first("output", "result", "results"); result != nil {
		msg.Content = append(msg.Content, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: id, Name: name, Content: stringOf(result)})
	}
	return []aiobservabilitytypes.Message{msg}
}

// reasoningParts returns one empty thinking part for encrypted reasoning without a summary.
func reasoningParts(m object) []aiobservabilitytypes.Part {
	parts := []aiobservabilitytypes.Part{}
	if summary, ok := m.list("summary"); ok {
		for _, s := range summary {
			parts = append(parts, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(asObject(s).first("text", "content"))})
		}
	}
	if content, ok := m.list("content"); ok {
		for _, c := range content {
			parts = append(parts, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(asObject(c).first("text", "content"))})
		}
	}
	if len(parts) == 0 {
		parts = append(parts, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking})
	}
	return parts
}

func textMessage(role aiobservabilitytypes.MessageRole, content string) aiobservabilitytypes.Message {
	return aiobservabilitytypes.Message{Role: role, Content: []aiobservabilitytypes.Part{textPart(content)}}
}

func genericMessages(content string) []aiobservabilitytypes.Message {
	return []aiobservabilitytypes.Message{{Content: []aiobservabilitytypes.Part{genericPart(content)}}}
}
