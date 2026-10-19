package aiobservabilitytypes

// Format: the flattened gen_ai.prompt.N.* and gen_ai.completion.N.* keys of openllmetry's instrumentations
// from before their semconv rewrite, role, content, tool_call_id, tool_calls.M.{id,name,arguments} and
// finish_reason, with list content as its JSON:
// https://github.com/traceloop/openllmetry/blob/93429cfb9767e6b51db6cb35f6b70f758117669a/packages/opentelemetry-semantic-conventions-ai/opentelemetry/semconv_ai/__init__.py#L159
// https://github.com/traceloop/openllmetry/blob/af487056a35625a2cff1c17ac83c2c0d90a02bca/packages/opentelemetry-instrumentation-openai/opentelemetry/instrumentation/openai/shared/chat_wrappers.py#L408
// https://github.com/traceloop/openllmetry/blob/af487056a35625a2cff1c17ac83c2c0d90a02bca/packages/opentelemetry-instrumentation-openai/opentelemetry/instrumentation/openai/shared/chat_wrappers.py#L460
// Written by: crewai through the openai instrumentation 0.45.6, mistralai 0.61.0 (https://github.com/traceloop/openllmetry/blob/4643b8826a6e6a4ce1968178d6ac9ca3ce607e2e/packages/opentelemetry-instrumentation-mistralai/opentelemetry/instrumentation/mistralai/__init__.py#L83),
// litellm beside its semconv value.

const (
	traceloopPrompts     = "gen_ai.prompt"
	traceloopCompletions = "gen_ai.completion"
)

func (f *formatting) traceloop() bool {
	prompts := indexed(f.attributes, traceloopPrompts)
	completions := indexed(f.attributes, traceloopCompletions)
	if len(prompts) == 0 && len(completions) == 0 {
		return false
	}
	f.out.Input = inputMessages(f.traceloopMessages(prompts))
	f.out.Output = f.traceloopMessages(completions)
	return true
}

// completionToolCalls adds the gen_ai.completion.N.function_call keys litellm writes beside its semconv value,
// whose parts never carry the tool calls, to the first output message without a tool call. N numbers the
// tool calls, not the choices:
// https://github.com/BerriAI/litellm/blob/9d72bae336ec0d14c41651adcb0d2e1149721f46/litellm/integrations/opentelemetry.py#L2770
// https://github.com/BerriAI/litellm/blob/9d72bae336ec0d14c41651adcb0d2e1149721f46/litellm/integrations/opentelemetry.py#L2369
func (f *formatting) completionToolCalls() {
	for i := range f.out.Output {
		if hasToolCall(f.out.Output[i].Parts) {
			continue
		}
		for _, completion := range indexed(f.attributes, traceloopCompletions) {
			f.out.Output[i].Parts = append(f.out.Output[i].Parts, traceloopToolCalls(completion)...)
		}
		return
	}
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

// traceloopToolCalls reads tool_calls.M.{id,name,arguments} and litellm's function_call object.
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
