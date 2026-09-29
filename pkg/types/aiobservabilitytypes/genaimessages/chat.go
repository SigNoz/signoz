package genaimessages

import (
	"cmp"
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// convertChatMessageList handles OpenAI, Anthropic, Bedrock, Vercel and LangChain message lists.
func convertChatMessageList(value any) ([]aiobservabilitytypes.Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	if !isChatMessage(list[0]) {
		return nil, false
	}
	messages := make([]aiobservabilitytypes.Message, 0, len(list))
	for _, item := range list {
		messages = append(messages, chatMessage(item, "")...)
	}
	return messages, true
}

func isChatMessage(value any) bool {
	m, ok := value.(map[string]any)
	if !ok {
		return false
	}
	if _, ok := m["role"]; ok {
		return true
	}
	if _, ok := m["gen_ai.event.content"]; ok {
		return true
	}
	switch typ := stringOf(m["type"]); typ {
	case "message", "reasoning", "human", "ai", "tool", "system":
		return true
	case "constructor":
		_, ok := m["kwargs"]
		return ok
	default:
		return isResponsesItemType(typ)
	}
}

// chatMessage returns nil for LangGraph tool definitions.
func chatMessage(value any, defaultRole aiobservabilitytypes.MessageRole) []aiobservabilitytypes.Message {
	m, ok := value.(map[string]any)
	if !ok {
		return genericMessages(stringOf(value))
	}
	if inner, role, ok := langChainMessage(m); ok {
		return chatMessage(inner, role)
	}
	if inner, ok := semanticKernelMessage(m); ok {
		return chatMessage(inner, defaultRole)
	}
	if isLangGraphToolDefinition(m) {
		return nil
	}

	typ := stringOf(m["type"])
	if isResponsesItemType(typ) {
		return responsesItemMessages(m, typ)
	}
	if typ == "reasoning" {
		return []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleAssistant, Content: reasoningParts(m)}}
	}

	role := cmp.Or(normalizeRole(stringOf(m["role"])), standardRole(typ), defaultRole)
	msg := aiobservabilitytypes.Message{
		Role:         role,
		Content:      append(messageContentParts(m, role), messageToolCallParts(m)...),
		FinishReason: normalizeFinishReason(finishReasonOf(m)),
	}
	if refusal := stringOf(m["refusal"]); refusal != "" {
		msg.Content = append(msg.Content, textPart(refusal))
	}
	return []aiobservabilitytypes.Message{msg}
}

// langChainMessage unwraps a serialised message: {lc, type: "constructor", id: [..., "HumanMessage"], kwargs}.
func langChainMessage(m map[string]any) (map[string]any, aiobservabilitytypes.MessageRole, bool) {
	kwargs, ok := m["kwargs"].(map[string]any)
	if !ok || stringOf(m["type"]) != "constructor" {
		return nil, "", false
	}
	return kwargs, cmp.Or(langChainRole(m["id"]), standardRole(stringOf(kwargs["type"]))), true
}

// semanticKernelMessage decodes the JSON string under gen_ai.event.content, lifting a
// top-level finish_reason into the nested message.
func semanticKernelMessage(m map[string]any) (map[string]any, bool) {
	event, ok := m["gen_ai.event.content"].(string)
	if !ok {
		return nil, false
	}
	var inner map[string]any
	if err := json.Unmarshal([]byte(event), &inner); err != nil || inner == nil {
		return nil, false
	}
	message, ok := inner["message"].(map[string]any)
	if !ok {
		return inner, true
	}
	if _, has := message["finish_reason"]; !has {
		message["finish_reason"] = inner["finish_reason"]
	}
	return message, true
}

// messageContentParts turns a tool message's text into its result.
func messageContentParts(m map[string]any, role aiobservabilitytypes.MessageRole) []aiobservabilitytypes.Part {
	parts := []aiobservabilitytypes.Part{}
	switch content := m["content"].(type) {
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
		if contentParts, ok := content["parts"].([]any); ok {
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

func messageToolCallParts(m map[string]any) []aiobservabilitytypes.Part {
	calls, _ := firstOf(m, "tool_calls", "toolCalls").([]any)
	if kwargs, ok := m["additional_kwargs"].(map[string]any); ok && len(calls) == 0 {
		calls, _ = kwargs["tool_calls"].([]any)
	}
	parts := make([]aiobservabilitytypes.Part, 0, len(calls)+1)
	for _, call := range calls {
		parts = append(parts, toolCallPart(call))
	}
	if call, ok := m["function_call"].(map[string]any); ok {
		parts = append(parts, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolCall, Name: stringOf(call["name"]), Arguments: parseArguments(call["arguments"])})
	}
	return parts
}

func toolMessageResult(m map[string]any, content string) aiobservabilitytypes.Part {
	return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: stringOf(firstOf(m, "tool_call_id", "toolCallId")), Name: stringOf(m["name"]), Content: content}
}

// isLangGraphToolDefinition matches {role: "tool", content: {type: "function"}} without tool_call_id.
func isLangGraphToolDefinition(m map[string]any) bool {
	if normalizeRole(stringOf(m["role"])) != aiobservabilitytypes.MessageRoleTool {
		return false
	}
	if _, has := m["tool_call_id"]; has {
		return false
	}
	content, ok := m["content"].(map[string]any)
	if !ok || stringOf(content["type"]) != "function" {
		return false
	}
	_, ok = content["function"]
	return ok
}

func contentBlockPart(value any) aiobservabilitytypes.Part {
	p, ok := value.(map[string]any)
	if !ok {
		if s, ok := value.(string); ok {
			return textPart(s)
		}
		return genericPart(value)
	}
	typ := stringOf(p["type"])
	switch typ {
	case "text", "input_text", "output_text", "refusal", "summary_text":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeText, Content: stringOf(firstOf(p, "text", "content", "refusal"))}
	case "thinking", "reasoning":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(firstOf(p, "thinking", "text", "content", "reasoning"))}
	case "redacted_thinking":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Redacted: true}
	case "tool-call", "tool_use", "tool_call", "function_call":
		return toolCallPart(p)
	case "tool-result", "tool_result", "function_call_output":
		return toolResultBlockPart(p, firstOf(p, "result", "output", "content"), false)
	case "server_tool_use", "mcp_tool_use":
		part := toolCallPart(p)
		part.Server = true
		return part
	case "":
		if part, ok := untypedBlockPart(p); ok {
			return part
		}
	default:
		if strings.HasSuffix(typ, "_tool_result") {
			return toolResultBlockPart(p, p["content"], true)
		}
	}
	return genericPart(p)
}

// untypedBlockPart reads blocks typed by field name: {text} and the Bedrock Converse toolUse / toolResult.
func untypedBlockPart(p map[string]any) (aiobservabilitytypes.Part, bool) {
	if text, ok := p["text"]; ok {
		return textPart(stringOf(text)), true
	}
	if use, ok := p["toolUse"].(map[string]any); ok {
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolCall, ID: stringOf(use["toolUseId"]), Name: stringOf(use["name"]), Arguments: parseArguments(use["input"])}, true
	}
	if result, ok := p["toolResult"].(map[string]any); ok {
		part := toolResultBlockPart(result, result["content"], false)
		part.ToolCallID = stringOf(result["toolUseId"])
		part.IsError = stringOf(result["status"]) == "error"
		return part, true
	}
	return aiobservabilitytypes.Part{}, false
}

// convertContentBlockList handles a bare content block list; the role is unknown.
func convertContentBlockList(value any) ([]aiobservabilitytypes.Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	msg := aiobservabilitytypes.Message{Content: make([]aiobservabilitytypes.Part, 0, len(list))}
	for _, item := range list {
		block, ok := item.(map[string]any)
		if !ok {
			return nil, false
		}
		if _, has := block["type"].(string); !has {
			return nil, false
		}
		part := contentBlockPart(block)
		if part.Type == aiobservabilitytypes.PartTypeGeneric {
			return nil, false
		}
		msg.Content = append(msg.Content, part)
	}
	return []aiobservabilitytypes.Message{msg}, true
}

func convertMessageObject(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	if _, ok := m["parts"]; ok {
		return semconvMessage(m, ""), true
	}
	if isChatMessage(m) {
		return chatMessage(m, ""), true
	}
	return nil, false
}
