package aiobservabilitytypes

import "strings"

// Format: OpenAI Responses, a request {input, instructions}, a response {output, status} or a bare list
// of items:
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L47597
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L69691
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L53834
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L57596
// Written by: gateways recording raw Responses bodies, the raw calls OpenInference records for the
// Responses API and the OpenAI Agents SDK when its flattened messages are absent, and LiteLLM's
// langfuse_otel callback, the function_call items of a tool-calling turn as a bare list.
// Handled: message items with input_text, output_text, refusal, input_image and input_file content;
// function_call and custom_tool_call with their outputs; reasoning summaries; compaction; every other
// *_call item as a server tool call and *_output item as its response; the status and incomplete_details
// of a response.
// Dropped: reasoning encrypted_content, item ids. Not yet: input_audio content.

// isResponsesRequest tells a Responses request from an embeddings one, which also carries input and
// model: items are objects, and only Responses takes instructions or tools.
func isResponsesRequest(m map[string]any) bool {
	if m["input"] == nil {
		return false
	}
	if m["instructions"] != nil || m["tools"] != nil || m["previous_response_id"] != nil {
		return true
	}
	items, ok := m["input"].([]any)
	if !ok {
		return false
	}
	_, isItem := firstObject(items)
	return isItem
}

// isResponsesItems looks for an item only the Responses API has, a tool call or its output, a reasoning
// or compaction item, all without a role; a list of messages has none.
func isResponsesItems(list []any) bool {
	for _, item := range list {
		m, _ := item.(map[string]any)
		typ := stringOf(m["type"])
		if m["role"] == nil && (typ == "reasoning" || typ == "compaction" || typ == "mcp_approval_response" || strings.HasSuffix(typ, "_call") || strings.HasSuffix(typ, "_output")) {
			return true
		}
	}
	return false
}

func isResponsesResponse(m map[string]any) bool {
	if _, ok := m["output"].([]any); !ok {
		return false
	}
	return stringOf(m["object"]) == "response" || m["status"] != nil
}

func (f *formatting) responsesRequest(m map[string]any) OutputMessages {
	var msgs OutputMessages
	if parts := systemParts(m["instructions"]); len(parts) > 0 {
		msgs = append(msgs, OutputMessage{Role: RoleSystem, Parts: parts})
	}
	switch input := m["input"].(type) {
	case string:
		msgs = append(msgs, OutputMessage{Role: RoleUser, Parts: Parts{part(textPart(input))}})
	case []any:
		msgs = append(msgs, foldAssistant(f.responsesItems(input))...)
	}
	return msgs
}

// responsesResponse folds the output items into one message: the API returns a single choice. The
// finish reason is the incomplete_details reason, else the status:
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L69763
func (f *formatting) responsesResponse(m map[string]any) OutputMessages {
	output, _ := m["output"].([]any)
	msgs := foldAssistant(f.responsesItems(output))
	if len(msgs) == 0 {
		return msgs
	}
	last := &msgs[len(msgs)-1]
	if details, ok := m["incomplete_details"].(map[string]any); ok {
		last.FinishReason = finishReason(stringOf(details["reason"]))
	} else if status := stringOf(m["status"]); status != "" {
		last.FinishReason = finishReason(status)
	}
	return msgs
}

// responsesItems converts items one message each; the caller folds assistant runs.
func (f *formatting) responsesItems(items []any) OutputMessages {
	msgs := make(OutputMessages, 0, len(items))
	for _, item := range items {
		m, ok := item.(map[string]any)
		if !ok {
			if s, ok := item.(string); ok {
				msgs = append(msgs, OutputMessage{Role: RoleUser, Parts: Parts{part(textPart(s))}})
				continue
			}
			msgs = append(msgs, genericMessage(item))
			continue
		}
		typ := stringOf(m["type"])
		switch {
		case typ == "" || typ == "message":
			msgs = append(msgs, f.openAIChatMessage(m))
		case typ == "function_call" || typ == "custom_tool_call":
			args := m["arguments"]
			if args == nil {
				args = m["input"]
			}
			call := ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(m["name"]), ID: optionalString(m["call_id"]), Arguments: decode(args)}
			msgs = append(msgs, OutputMessage{Role: RoleAssistant, Parts: Parts{part(call)}})
		case typ == "function_call_output" || typ == "custom_tool_call_output":
			result := ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: optionalString(m["call_id"]), Response: toolResponse(m["output"])}
			msgs = append(msgs, OutputMessage{Role: RoleTool, Parts: Parts{part(result)}})
		case typ == "reasoning":
			if p, ok := reasoningItem(m); ok {
				msgs = append(msgs, OutputMessage{Role: RoleAssistant, Parts: Parts{p}})
			}
		case typ == "compaction":
			msgs = append(msgs, OutputMessage{Role: RoleAssistant, Parts: Parts{part(CompactionPart{Type: PartTypeCompaction, ID: optionalString(m["id"]), Content: optionalString(m["content"])})}})
		case strings.HasSuffix(typ, "_call"):
			call := ServerToolCallPart{Type: PartTypeServerToolCall, Name: strings.TrimSuffix(typ, "_call"), ID: optionalString(m["call_id"]), ServerToolCall: GenericServerToolCall(m)}
			msgs = append(msgs, OutputMessage{Role: RoleAssistant, Parts: Parts{part(call)}})
		case strings.HasSuffix(typ, "_output") || typ == "mcp_approval_response":
			result := ServerToolCallResponsePart{Type: PartTypeServerToolCallResponse, ID: optionalString(m["call_id"]), ServerToolCallResponse: GenericServerToolCallResponse(m)}
			msgs = append(msgs, OutputMessage{Role: RoleTool, Parts: Parts{part(result)}})
		default:
			msgs = append(msgs, OutputMessage{Role: RoleAssistant, Parts: Parts{part(GenericPart(m))}})
		}
	}
	return msgs
}

// reasoningItem joins the summary texts. An item with neither a summary nor encrypted content
// carries nothing to show:
// https://github.com/openai/openai-openapi/blob/aeb6a041dc56c011ca9f12127ec898f911100aa0/openapi.yaml#L69620
func reasoningItem(m map[string]any) (Part, bool) {
	var texts []string
	if summary, ok := m["summary"].([]any); ok {
		for _, item := range summary {
			if s, ok := item.(map[string]any); ok && stringOf(s["text"]) != "" {
				texts = append(texts, stringOf(s["text"]))
			}
		}
	}
	if len(texts) == 0 && stringOf(m["encrypted_content"]) == "" {
		return Part{}, false
	}
	return part(ReasoningPart{Type: PartTypeReasoning, Content: strings.Join(texts, "\n")}), true
}
