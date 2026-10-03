package genaimessages

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

func contentBlockPart(value any) aiobservabilitytypes.Part {
	p, ok := toObject(value)
	if !ok {
		if s, ok := value.(string); ok {
			return textPart(s)
		}
		return genericPart(value)
	}
	typ := p.str("type")
	switch typ {
	case "text", "input_text", "output_text", "refusal", "summary_text":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeText, Content: stringOf(p.first("text", "content", "refusal"))}
	case "thinking", "reasoning":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(p.first("thinking", "text", "content", "reasoning"))}
	case "redacted_thinking":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking}
	case "tool-call", "tool_use", "tool_call", "function_call", "server_tool_use", "mcp_tool_use":
		return toolCallPart(p)
	case "tool-result", "tool_result", "function_call_output":
		return toolResultBlockPart(p, p.first("result", "output", "content"))
	case "":
		if text, ok := p.get("text"); ok {
			return textPart(stringOf(text))
		}
	default:
		if strings.HasSuffix(typ, "_tool_result") {
			return toolResultBlockPart(p, p.at("content"))
		}
	}
	return genericPart(p)
}

func semconvPart(value any) aiobservabilitytypes.Part {
	p, ok := toObject(value)
	if !ok {
		if s, ok := value.(string); ok {
			return textPart(s)
		}
		return genericPart(value)
	}
	switch p.str("type") {
	case "text":
		if p.flag("thought") {
			return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(p.first("content", "text"))}
		}
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeText, Content: stringOf(p.first("content", "text"))}
	case "reasoning", "thinking":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(p.first("content", "thinking", "text"))}
	case "redacted_thinking", "redacted_reasoning":
		return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking}
	case "tool_call":
		return aiobservabilitytypes.Part{
			Type:      aiobservabilitytypes.PartTypeToolCall,
			ID:        p.str("id"),
			Name:      p.str("name"),
			Arguments: parseArguments(p.first("arguments", "args", "input")),
		}
	case "tool_call_response":
		return aiobservabilitytypes.Part{
			Type:       aiobservabilitytypes.PartTypeToolResult,
			ToolCallID: p.str("id"),
			Name:       p.str("name"),
			Content:    stringOf(p.first("response", "result", "content", "output")),
			IsError:    boolOf(p.first("is_error", "isError")),
		}
	case "":
		// Gemini parts carry no type; the field name is the type.
		if text, ok := p.get("text"); ok {
			if p.flag("thought") {
				return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: stringOf(text)}
			}
			return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeText, Content: stringOf(text)}
		}
		if call, ok := toObject(p.first("functionCall", "function_call")); ok {
			return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolCall, ID: call.str("id"), Name: call.str("name"), Arguments: parseArguments(call.at("args"))}
		}
		if resp, ok := toObject(p.first("functionResponse", "function_response")); ok {
			return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeToolResult, ToolCallID: resp.str("id"), Name: resp.str("name"), Content: resp.str("response")}
		}
	}
	return genericPart(p)
}

// toolCallPart reads the OpenAI, flat, Anthropic and Vercel tool call shapes.
func toolCallPart(value any) aiobservabilitytypes.Part {
	call, ok := toObject(value)
	if !ok {
		return genericPart(value)
	}
	part := aiobservabilitytypes.Part{
		Type: aiobservabilitytypes.PartTypeToolCall,
		ID:   stringOf(call.first("toolCallId", "call_id", "id")),
		Name: stringOf(call.first("toolName", "name")),
	}
	if fn, ok := call.obj("function"); ok {
		part.Name = fn.str("name")
		part.Arguments = parseArguments(fn.at("arguments"))
		return part
	}
	part.Arguments = parseArguments(call.first("arguments", "args", "input"))
	return part
}

// toolResultBlockPart unwraps the Vercel {type, value} result wrapper.
func toolResultBlockPart(p object, result any) aiobservabilitytypes.Part {
	if nested, ok := toObject(result); ok && len(nested) <= 2 {
		if v, ok := nested.get("value"); ok {
			result = v
		}
	}
	return aiobservabilitytypes.Part{
		Type:       aiobservabilitytypes.PartTypeToolResult,
		ToolCallID: stringOf(p.first("toolCallId", "tool_use_id", "tool_call_id", "call_id", "id")),
		Name:       stringOf(p.first("toolName", "name")),
		Content:    toolResultText(result),
		IsError:    boolOf(p.first("isError", "is_error")),
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
		block := asObject(item)
		text, ok := block.text("text")
		if !ok || (len(block) == 2 && block.str("type") != "text") || len(block) > 2 {
			return stringOf(result)
		}
		texts = append(texts, text)
	}
	return strings.Join(texts, "\n")
}

func textPart(content string) aiobservabilitytypes.Part {
	return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeText, Content: content}
}

func genericPart(value any) aiobservabilitytypes.Part {
	return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeGeneric, Content: stringOf(value)}
}
