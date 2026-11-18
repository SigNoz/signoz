package aiobservabilitytypes

// Format: Gemini generateContent, a request {contents, systemInstruction} or a response {candidates} of
// Content {role, parts} objects, in the REST camelCase or the SDK snake_case spelling:
// https://ai.google.dev/api/generate-content
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2303
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2626
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L8351
// Written by: gateways recording raw Gemini bodies. OpenInference flattens these into llm.*_messages,
// which take precedence.
// Handled: text, thought text, inlineData, fileData, functionCall, functionResponse; a functionResponse
// inside a user turn becomes a tool message before it. Any other part is kept as sent.
// Not yet: a blocked prompt, promptFeedback without candidates.

func isGeminiRequest(m map[string]any) bool {
	switch m["contents"].(type) {
	case []any, string:
		return true
	}
	return false
}

func isGeminiResponse(m map[string]any) bool {
	_, ok := m["candidates"].([]any)
	return ok
}

// isGeminiContent tells a bare Content from a semconv message: both carry parts, only semconv parts
// have a type.
func isGeminiContent(m map[string]any) bool {
	parts, ok := m["parts"].([]any)
	if !ok {
		return false
	}
	first, ok := firstObject(parts)
	return ok && first["type"] == nil
}

// geminiRequest reads contents and systemInstruction:
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L6527
func (f *formatting) geminiRequest(m map[string]any) OutputMessages {
	var msgs OutputMessages
	if system := geminiSystemInstruction(objectAt(m, "systemInstruction", "system_instruction")); system != nil {
		msgs = append(msgs, *system)
	}
	switch contents := m["contents"].(type) {
	case string:
		msgs = append(msgs, OutputMessage{Role: RoleUser, Parts: Parts{part(textPart(contents))}})
	case []any:
		msgs = append(msgs, f.geminiContents(contents)...)
	}
	return msgs
}

// geminiResponse is one message per candidate with its finish reason.
func (f *formatting) geminiResponse(m map[string]any) OutputMessages {
	candidates, _ := m["candidates"].([]any)
	out := make(OutputMessages, 0, len(candidates))
	for _, item := range candidates {
		candidate, ok := item.(map[string]any)
		if !ok {
			out = append(out, genericMessage(item))
			continue
		}
		content, _ := candidate["content"].(map[string]any)
		msg := geminiContent(content, RoleAssistant)
		msg.FinishReason = finishReason(stringOf(objectAt(candidate, "finishReason", "finish_reason")))
		out = append(out, msg)
	}
	return out
}

// geminiSystemInstruction accepts a string, a Content or a list of parts.
func geminiSystemInstruction(value any) *OutputMessage {
	var parts Parts
	switch v := value.(type) {
	case map[string]any:
		parts = geminiContent(v, RoleSystem).Parts
	case []any:
		parts = geminiParts(v)
	default:
		parts = systemParts(value)
	}
	if len(parts) == 0 {
		return nil
	}
	return &OutputMessage{Role: RoleSystem, Parts: parts}
}

func (f *formatting) geminiContents(list []any) OutputMessages {
	out := make(OutputMessages, 0, len(list))
	for _, item := range list {
		switch v := item.(type) {
		case string:
			out = append(out, OutputMessage{Role: RoleUser, Parts: Parts{part(textPart(v))}})
		case map[string]any:
			out = append(out, splitToolResults(geminiContent(v, RoleUser))...)
		default:
			out = append(out, genericMessage(item))
		}
	}
	return out
}

func geminiContent(c map[string]any, fallback Role) OutputMessage {
	msg := OutputMessage{Role: role(stringOf(c["role"])), Parts: Parts{}}
	if msg.Role.IsZero() {
		msg.Role = fallback
	}
	parts, _ := c["parts"].([]any)
	msg.Parts = geminiParts(parts)
	return msg
}

func geminiParts(list []any) Parts {
	parts := Parts{}
	for _, item := range list {
		if p, ok := item.(map[string]any); ok {
			parts = append(parts, geminiPart(p))
		} else {
			parts = append(parts, contentPart(item))
		}
	}
	return parts
}

// geminiPart converts one Part by the one field it carries:
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2324
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2112
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L1731
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L1830
// https://github.com/googleapis/python-genai/blob/78f6d3412caaaed44f99ce57be2d16d0b8c407cb/google/genai/types.py#L2032
func geminiPart(p map[string]any) Part {
	if text, ok := p["text"].(string); ok {
		if thought, _ := p["thought"].(bool); thought {
			return part(ReasoningPart{Type: PartTypeReasoning, Content: text})
		}
		return part(textPart(text))
	}
	if data, ok := objectAt(p, "inlineData", "inline_data").(map[string]any); ok {
		mime := stringOf(objectAt(data, "mimeType", "mime_type"))
		return part(BlobPart{Type: PartTypeBlob, Modality: modalityOf(mime), MimeType: optionalString(mime), Content: stringOf(data["data"])})
	}
	if file, ok := objectAt(p, "fileData", "file_data").(map[string]any); ok {
		mime := stringOf(objectAt(file, "mimeType", "mime_type"))
		return part(UriPart{Type: PartTypeURI, Modality: modalityOf(mime), MimeType: optionalString(mime), URI: stringOf(objectAt(file, "fileUri", "file_uri"))})
	}
	if call, ok := objectAt(p, "functionCall", "function_call").(map[string]any); ok {
		return part(ToolCallRequestPart{Type: PartTypeToolCall, ID: optionalString(call["id"]), Name: stringOf(call["name"]), Arguments: call["args"]})
	}
	if response, ok := objectAt(p, "functionResponse", "function_response").(map[string]any); ok {
		return part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: optionalString(response["id"]), Response: response["response"]})
	}
	return part(GenericPart(p))
}

// objectAt reads the first of the key spellings that is set.
func objectAt(m map[string]any, keys ...string) any {
	for _, key := range keys {
		if v, ok := m[key]; ok && v != nil {
			return v
		}
	}
	return nil
}
