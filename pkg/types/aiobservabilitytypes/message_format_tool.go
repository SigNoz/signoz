package aiobservabilitytypes

// Format: gen_ai.tool.call.arguments and gen_ai.tool.call.result on an execute_tool span, each an
// object or its JSON string (open-telemetry/semantic-conventions-genai@06ec68e, model/gen-ai/registry.yaml).
// Written by: opentelemetry-instrumentation-langchain, traceloop @tool, OpenInference TOOL spans and
// Vercel ai.toolCall.* through the span mapper.
// Envelopes unwrapped: LangChain's callback payloads, {input_str, tags, metadata, inputs, kwargs} and
// {output, kwargs} (openllmetry callback_handler.py on_tool_start/on_tool_end), and the traceloop
// decorator's {args, kwargs} (traceloop-sdk decorators/base.py _handle_span_input).

// tool renders the call as an assistant tool_call and the result as a tool tool_call_response, both
// carrying gen_ai.tool.call.id so the pair can be matched.
func (f *formatting) tool() {
	id := optionalString(f.attr(GenAIToolCallID))
	if raw := f.attr(GenAIToolCallArguments); raw != nil {
		call := ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(f.attr(GenAIToolName)), ID: id, Arguments: toolArguments(decode(raw))}
		f.out.Input = InputMessages{{Role: RoleAssistant, Parts: Parts{part(call)}}}
	}
	if raw := f.attr(GenAIToolCallResult); raw != nil {
		result := ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: id, Response: toolResult(decode(raw))}
		f.out.Output = OutputMessages{{Role: RoleTool, Parts: Parts{part(result)}}}
	}
	f.out.Formatter = FormatterTool
}

func toolArguments(value any) any {
	m, ok := value.(map[string]any)
	if !ok {
		return value
	}
	if _, isLangChain := m["input_str"]; isLangChain && hasKeys(m, "inputs", "kwargs") {
		if inputs := m["inputs"]; inputs != nil {
			return inputs
		}
		return decode(m["input_str"])
	}
	if len(m) == 2 && hasKeys(m, "args", "kwargs") {
		args, _ := m["args"].([]any)
		kwargs, _ := m["kwargs"].(map[string]any)
		switch {
		case len(args) == 0:
			return m["kwargs"]
		case len(kwargs) == 0:
			return args
		}
	}
	return value
}

// toolResult unwraps the LangChain envelope; the traceloop decorator encodes a tool returning
// nothing as the literal null.
func toolResult(value any) any {
	if m, ok := value.(map[string]any); ok && len(m) == 2 && hasKeys(m, "output", "kwargs") {
		return decode(m["output"])
	}
	if value == "null" {
		return nil
	}
	return value
}

func hasKeys(m map[string]any, keys ...string) bool {
	for _, key := range keys {
		if _, ok := m[key]; !ok {
			return false
		}
	}
	return true
}
