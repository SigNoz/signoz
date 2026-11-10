package aiobservabilitytypes

// Format: gen_ai.tool.call.arguments and gen_ai.tool.call.result on an execute_tool span, each an
// object or its JSON string:
// https://github.com/open-telemetry/semantic-conventions-genai/blob/06ec68e722c45a7218e23ea1bc1339fe4e21ecae/model/gen-ai/registry.yaml#L545
// Written by: opentelemetry-instrumentation-langchain, traceloop @tool, OpenInference TOOL spans and
// Vercel ai.toolCall.* through the span mapper.
// Envelopes unwrapped: LangChain's on_tool_start and on_tool_end payloads, {input_str, tags, metadata,
// inputs, kwargs} and {output, kwargs}:
// https://github.com/traceloop/openllmetry/blob/93429cfb9767e6b51db6cb35f6b70f758117669a/packages/opentelemetry-instrumentation-langchain/opentelemetry/instrumentation/langchain/callback_handler.py#L837
// The traceloop decorator's {args, kwargs}:
// https://github.com/traceloop/openllmetry/blob/93429cfb9767e6b51db6cb35f6b70f758117669a/packages/traceloop-sdk/traceloop/sdk/decorators/base.py#L169

// tool renders the call as an assistant tool_call and the result as a tool tool_call_response, both
// carrying gen_ai.tool.call.id so the pair can be matched.
func (f *formatting) tool() {
	id := optionalString(attribute(f.attributes, GenAIToolCallID))
	if raw := attribute(f.attributes, GenAIToolCallArguments); raw != nil {
		call := ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(attribute(f.attributes, GenAIToolName)), ID: id, Arguments: toolArguments(decode(raw))}
		f.out.Input = InputMessages{{Role: RoleAssistant, Parts: Parts{part(call)}}}
	}
	if raw := attribute(f.attributes, GenAIToolCallResult); raw != nil {
		result := ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: id, Response: toolResult(decode(raw))}
		f.out.Output = OutputMessages{{Role: RoleTool, Parts: Parts{part(result)}}}
	}
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
