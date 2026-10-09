package genaiformatter

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes/genai"
)

// Format: OpenAI Chat Completions, a request {messages}, a response {choices}, or a bare message list.
// Written by: bifrost, openrouter requests, the raw OpenAI calls OpenInference records.
// Handled: string and block content, tool_calls nested or flattened, tool messages, refusal,
// reasoning_content, finish reasons.
// Not yet: streaming delta chunks, legacy completions choices[].text, audio output.

func (f *formatting) openAIChatMessages(list []any) genai.OutputMessages {
	out := make(genai.OutputMessages, 0, len(list))
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
func (f *formatting) openAIChatResponse(choices []any) genai.OutputMessages {
	out := make(genai.OutputMessages, 0, len(choices))
	for _, item := range choices {
		choice, ok := item.(map[string]any)
		if !ok {
			continue
		}
		inner, _ := object(choice).obj("message")
		msg := f.openAIChatMessage(inner)
		if msg.Role.IsZero() {
			msg.Role = genai.RoleAssistant
		}
		if fr := finishReason(object(choice).str("finish_reason")); fr != nil {
			msg.FinishReason = fr
		}
		out = append(out, msg)
	}
	return out
}

// openAIChatMessage converts one {role, content, tool_calls, ...} message in the OpenAI chat shape.
func (f *formatting) openAIChatMessage(m object) genai.OutputMessage {
	msg := genai.OutputMessage{Role: role(m.str("role")), Parts: genai.Parts{}, Name: optionalString(m["name"]), FinishReason: finishReason(m.str("finish_reason"))}

	if id := m.str("tool_call_id"); msg.Role == genai.RoleTool && id != "" {
		msg.Parts = genai.Parts{part(genai.ToolCallResponsePart{Type: genai.PartTypeToolCallResponse, ID: &id, Response: toolResponse(m["content"])})}
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
	if refusal := m.str("refusal"); refusal != "" {
		msg.Parts = append(msg.Parts, part(textPart(refusal)))
	}
	if reasoning := m.text("reasoning_content", "reasoning"); reasoning != "" {
		msg.Parts = append(msg.Parts, part(genai.ReasoningPart{Type: genai.PartTypeReasoning, Content: reasoning}))
	}
	if calls, ok := m.list("tool_calls"); ok {
		for _, call := range calls {
			if c, ok := call.(map[string]any); ok {
				msg.Parts = append(msg.Parts, toolCallPart(c))
			}
		}
	}
	if call, ok := m.obj("function_call"); ok {
		msg.Parts = append(msg.Parts, part(genai.ToolCallRequestPart{Type: genai.PartTypeToolCall, Name: call.str("name"), Arguments: decode(call["arguments"])}))
	}
	return msg
}

// toolCallPart reads {id, function: {name, arguments}}; a gateway may flatten it to {id, name, arguments|args}.
func toolCallPart(c object) genai.Part {
	call := genai.ToolCallRequestPart{Type: genai.PartTypeToolCall, ID: optionalString(c["id"]), Name: c.str("name")}
	args := c["arguments"]
	if args == nil {
		args = c["args"]
	}
	if fn, ok := c.obj("function"); ok {
		call.Name = fn.str("name")
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
			if !ok || object(block).str("type") != "text" {
				return v
			}
			texts = append(texts, object(block).str("text"))
		}
		return strings.Join(texts, "\n")
	}
	return value
}
