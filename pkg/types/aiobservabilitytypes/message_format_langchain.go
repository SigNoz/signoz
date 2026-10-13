package aiobservabilitytypes

import "strings"

// Format: LangChain's serialised run inputs and outputs, {messages: [[Serializable]]} and
// {generations: [[{text, generation_info, message}]]}, each message {lc: 1, type: "constructor",
// id: [..., class], kwargs: {content, tool_calls, tool_call_id, name, ...}} (langchain-ai/langchain
// libs/core/langchain_core/load/serializable.py; langchain_core.messages for the classes).
// Written by: the LangSmith OTel exporter as gen_ai.prompt and gen_ai.completion
// (langchain-ai/langsmith-sdk python/langsmith/_internal/_otel_exporter.py).
// Handled: the message classes, string and block content, tool_calls, the legacy function_call,
// tool messages, the finish reason of a generation.

// LangChain message classes to roles; ChatMessage carries its own role in kwargs.
var langChainRoles = map[string]Role{
	"SystemMessage": RoleSystem, "SystemMessageChunk": RoleSystem,
	"HumanMessage": RoleUser, "HumanMessageChunk": RoleUser,
	"AIMessage": RoleAssistant, "AIMessageChunk": RoleAssistant,
	"ToolMessage": RoleTool, "ToolMessageChunk": RoleTool, "FunctionMessage": RoleTool, "FunctionMessageChunk": RoleTool,
}

func isLangChainRun(m map[string]any) bool {
	if _, ok := m["generations"].([]any); ok {
		return true
	}
	batches, ok := m["messages"].([]any)
	if !ok || len(batches) == 0 {
		return false
	}
	first, ok := batches[0].([]any)
	if !ok {
		return false
	}
	msg, ok := firstObject(first)
	return ok && msg["lc"] != nil
}

// langChainRun converts the run inputs, every batch of messages in order, or the run outputs, one
// message per generation.
func (f *formatting) langChainRun(m map[string]any) OutputMessages {
	var out OutputMessages
	if batches, ok := m["messages"].([]any); ok {
		for _, batch := range batches {
			if list, ok := batch.([]any); ok {
				out = append(out, f.langChainMessages(list)...)
			}
		}
		return out
	}
	batches, _ := m["generations"].([]any)
	for _, batch := range batches {
		list, _ := batch.([]any)
		for _, item := range list {
			generation, ok := item.(map[string]any)
			if !ok {
				out = append(out, genericMessage(item))
				continue
			}
			msg := OutputMessage{Role: RoleAssistant, Parts: Parts{}}
			if message, ok := generation["message"].(map[string]any); ok {
				msg = f.langChainMessage(message)
			} else if text := stringOf(generation["text"]); text != "" {
				msg.Parts = Parts{part(textPart(text))}
			}
			if info, ok := generation["generation_info"].(map[string]any); ok && msg.FinishReason == nil {
				msg.FinishReason = finishReason(stringOf(info["finish_reason"]))
			}
			out = append(out, msg)
		}
	}
	return out
}

func (f *formatting) langChainMessages(list []any) OutputMessages {
	out := make(OutputMessages, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		if !ok {
			out = append(out, genericMessage(item))
			continue
		}
		out = append(out, f.langChainMessage(m))
	}
	return out
}

func (f *formatting) langChainMessage(m map[string]any) OutputMessage {
	kwargs, _ := m["kwargs"].(map[string]any)
	msg := OutputMessage{Role: langChainRole(m, kwargs), Parts: Parts{}, Name: optionalString(kwargs["name"])}
	if id := stringOf(kwargs["tool_call_id"]); msg.Role == RoleTool && id != "" {
		msg.Parts = Parts{part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: &id, Response: toolResponse(kwargs["content"])})}
		return msg
	}
	calls, _ := kwargs["tool_calls"].([]any)
	switch content := kwargs["content"].(type) {
	case string:
		if content != "" {
			msg.Parts = append(msg.Parts, part(textPart(content)))
		}
	case []any:
		for _, item := range content {
			if block, ok := item.(map[string]any); ok && len(calls) > 0 && (block["type"] == "tool_call" || block["type"] == "tool_use") {
				continue
			}
			msg.Parts = append(msg.Parts, contentPart(item))
		}
	}
	for _, item := range calls {
		if call, ok := item.(map[string]any); ok {
			msg.Parts = append(msg.Parts, part(ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(call["name"]), ID: optionalString(call["id"]), Arguments: decode(call["args"])}))
		}
	}
	if extra, ok := kwargs["additional_kwargs"].(map[string]any); ok && len(calls) == 0 {
		if call, ok := extra["function_call"].(map[string]any); ok {
			msg.Parts = append(msg.Parts, part(ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(call["name"]), Arguments: decode(call["arguments"])}))
		}
	}
	if metadata, ok := kwargs["response_metadata"].(map[string]any); ok {
		msg.FinishReason = finishReason(stringOf(metadata["finish_reason"]))
		if body, ok := metadata["body"].(map[string]any); ok && body["error"] != nil {
			msg.FinishReason = finishReason("error")
		}
	}
	return msg
}

// langChainRole reads the message class from the serialised id path, falling back to the type
// alias in kwargs.
func langChainRole(m, kwargs map[string]any) Role {
	if id, ok := m["id"].([]any); ok && len(id) > 0 {
		class := stringOf(id[len(id)-1])
		if r, ok := langChainRoles[class]; ok {
			return r
		}
		if strings.HasPrefix(class, "ChatMessage") {
			return role(stringOf(kwargs["role"]))
		}
	}
	return role(stringOf(kwargs["type"]))
}
