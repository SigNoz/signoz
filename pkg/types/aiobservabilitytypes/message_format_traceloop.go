package aiobservabilitytypes

// Format: the flattened gen_ai.prompt.N.* and gen_ai.completion.N.* keys of openllmetry's
// pre-semconv instrumentations (traceloop/openllmetry@94d3f04, opentelemetry-semantic-conventions-ai
// LLM_PROMPTS and LLM_COMPLETIONS; mistralai/__init__.py writes role and content, the openai
// instrumentation before its semconv rewrite also tool_calls.M.{id,name,arguments}, tool_call_id
// and function_call.{name,arguments}).
// Written by: crewai through the openai instrumentation, mistralai, litellm beside its semconv value.

const (
	traceloopPrompts     = "gen_ai.prompt"
	traceloopCompletions = "gen_ai.completion"
)

func (f *formatting) traceloop() bool {
	prompts := indexed(f.attrs, traceloopPrompts)
	completions := indexed(f.attrs, traceloopCompletions)
	if len(prompts) == 0 && len(completions) == 0 {
		return false
	}
	f.out.Input = inputMessages(f.traceloopMessages(prompts))
	f.out.Output = f.traceloopMessages(completions)
	f.out.Formatter = FormatterTraceloop
	return true
}

func (f *formatting) traceloopMessages(buckets []map[string]any) OutputMessages {
	out := make(OutputMessages, 0, len(buckets))
	for i, m := range buckets {
		msg := OutputMessage{Role: role(stringOf(m["role"])), Parts: Parts{}, Name: optionalString(m["name"]), FinishReason: finishReason(stringOf(m["finish_reason"]))}
		content, hasContent := m["content"]
		if id := stringOf(m["tool_call_id"]); msg.Role == RoleTool && id != "" {
			msg.Parts = Parts{part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: &id, Response: decode(content)})}
			out = append(out, msg)
			continue
		}
		if hasContent {
			msg.Parts = append(msg.Parts, traceloopContent(content)...)
		}
		msg.Parts = append(msg.Parts, traceloopToolCalls(m)...)
		if len(msg.Parts) == 0 {
			f.warn("message %d has no content", i)
		}
		out = append(out, msg)
	}
	return out
}

// traceloopContent reads a content value, a string or the JSON of an OpenAI content block list.
func traceloopContent(content any) Parts {
	if blocks, ok := decode(content).([]any); ok {
		parts := make(Parts, 0, len(blocks))
		for _, block := range blocks {
			parts = append(parts, contentPart(block))
		}
		return parts
	}
	if text := stringOf(content); text != "" {
		return Parts{part(textPart(text))}
	}
	return nil
}

// traceloopToolCalls reads tool_calls.M.{id,name,arguments} and the legacy function_call object.
func traceloopToolCalls(m map[string]any) Parts {
	var parts Parts
	for _, call := range indexed(m, "tool_calls") {
		parts = append(parts, part(ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(call["name"]), ID: optionalString(call["id"]), Arguments: decode(call["arguments"])}))
	}
	if call, ok := m["function_call"].(map[string]any); ok {
		parts = append(parts, part(ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(call["name"]), Arguments: decode(call["arguments"])}))
	}
	return parts
}
