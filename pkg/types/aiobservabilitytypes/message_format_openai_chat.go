package aiobservabilitytypes

import (
	"strings"
)

// Format: OpenAI Chat Completions, a request {messages}, a response {choices}, a bare message list, or a
// single message.
// Written by: bifrost, openrouter requests, the raw OpenAI calls OpenInference records, the Langfuse SDK.
// Handled: string and block content, tool_calls nested or flattened, tool messages, refusal,
// reasoning_content, finish reasons.
// Not yet: streaming delta chunks, legacy completions choices[].text, audio output.

func (f *formatting) openAIChatMessages(list []any) OutputMessages {
	out := make(OutputMessages, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		if !ok {
			out = append(out, genericMessage(item))
			continue
		}
		out = append(out, f.openAIChatMessage(m))
	}
	return out
}

// openAIChatResponse converts the choices of an OpenAI chat response, one message each with its
// finish reason.
func (f *formatting) openAIChatResponse(choices []any) OutputMessages {
	out := make(OutputMessages, 0, len(choices))
	for _, item := range choices {
		choice, ok := item.(map[string]any)
		if !ok {
			out = append(out, genericMessage(item))
			continue
		}
		inner, _ := choice["message"].(map[string]any)
		msg := f.openAIChatMessage(inner)
		if msg.Role.IsZero() {
			msg.Role = RoleAssistant
		}
		if fr := finishReason(stringOf(choice["finish_reason"])); fr != nil {
			msg.FinishReason = fr
		}
		out = append(out, msg)
	}
	return out
}

// openAIChatMessage converts one {role, content, tool_calls, ...} message in the OpenAI chat shape.
func (f *formatting) openAIChatMessage(m map[string]any) OutputMessage {
	msg := OutputMessage{Role: role(stringOf(m["role"])), Parts: Parts{}, Name: optionalString(m["name"]), FinishReason: finishReason(stringOf(m["finish_reason"]))}

	if id := stringOf(m["tool_call_id"]); msg.Role == RoleTool && id != "" {
		msg.Parts = Parts{part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: &id, Response: toolResponse(m["content"])})}
		return msg
	}

	switch content := m["content"].(type) {
	case string:
		if content != "" {
			msg.Parts = append(msg.Parts, part(textPart(content)))
		}
	case []any:
		for _, item := range content {
			msg.Parts = append(msg.Parts, contentPart(item))
		}
	}
	if refusal := stringOf(m["refusal"]); refusal != "" {
		msg.Parts = append(msg.Parts, part(textPart(refusal)))
	}
	reasoning, _ := m["reasoning_content"].(string)
	if reasoning == "" {
		reasoning, _ = m["reasoning"].(string)
	}
	if reasoning != "" {
		msg.Parts = append(msg.Parts, part(ReasoningPart{Type: PartTypeReasoning, Content: reasoning}))
	}
	if calls, ok := m["tool_calls"].([]any); ok {
		for _, call := range calls {
			if c, ok := call.(map[string]any); ok {
				msg.Parts = append(msg.Parts, toolCallPart(c))
			}
		}
	}
	if call, ok := m["function_call"].(map[string]any); ok {
		msg.Parts = append(msg.Parts, part(ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(call["name"]), Arguments: decode(call["arguments"])}))
	}
	return msg
}

// openAIChatSingle converts a message recorded outside a list: the first choice's message the Langfuse
// OpenAI wrapper writes as the output, or the additional_kwargs of a LangChain AIMessage, {tool_calls}
// without a role, which the Langfuse LangChain handler writes for a tool-calling turn:
// https://github.com/langfuse/langfuse-python/blob/18baf80450dd5f9c1f85916eb2d1b3c72d2052e1/langfuse/openai.py#L446
// https://github.com/langfuse/langfuse-python/blob/18baf80450dd5f9c1f85916eb2d1b3c72d2052e1/langfuse/langchain/CallbackHandler.py#L1558
func (f *formatting) openAIChatSingle(m map[string]any) OutputMessage {
	msg := f.openAIChatMessage(m)
	if msg.Role.IsZero() {
		msg.Role = RoleAssistant
	}
	return msg
}

// toolCallPart reads {id, function: {name, arguments}}; a gateway may flatten it to {id, name, arguments|args}.
func toolCallPart(c map[string]any) Part {
	call := ToolCallRequestPart{Type: PartTypeToolCall, ID: optionalString(c["id"]), Name: stringOf(c["name"])}
	args := c["arguments"]
	if args == nil {
		args = c["args"]
	}
	if fn, ok := c["function"].(map[string]any); ok {
		call.Name = stringOf(fn["name"])
		args = fn["arguments"]
	}
	if args != nil {
		call.Arguments = decode(args)
	}
	return part(call)
}

// toolResponse parses a JSON string and joins text blocks; anything else stays as sent.
func toolResponse(value any) any {
	switch v := value.(type) {
	case string:
		return decode(v)
	case []any:
		texts := make([]string, 0, len(v))
		for _, item := range v {
			block, ok := item.(map[string]any)
			if !ok || stringOf(block["type"]) != "text" {
				return v
			}
			texts = append(texts, stringOf(block["text"]))
		}
		return strings.Join(texts, "\n")
	}
	return value
}
