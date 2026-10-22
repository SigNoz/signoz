package aiobservabilitytypes

import "strings"

// Format: the {completion, reasoning, tools, rawRequest} answer object OpenRouter's broadcast writes as
// gen_ai.completion on its LLM Generation spans, beside the OpenAI chat {messages} request it writes as
// gen_ai.prompt; the span mapper moves both onto gen_ai.*.messages. A tool call arrives as the tool name
// followed by its JSON arguments in completion, so it is split against the names in tools.
// https://openrouter.ai/docs/guides/features/broadcast/otel-collector

func isOpenRouterCompletion(m map[string]any) bool {
	_, ok := m["completion"].(string)
	return ok
}

func (f *formatting) openRouterCompletion(m map[string]any) OutputMessages {
	msg := OutputMessage{Role: RoleAssistant, Parts: Parts{}}
	if reasoning := stringOf(m["reasoning"]); reasoning != "" {
		msg.Parts = append(msg.Parts, part(ReasoningPart{Type: PartTypeReasoning, Content: reasoning}))
	}
	completion := stringOf(m["completion"])
	if call, ok := openRouterToolCall(completion, m["tools"]); ok {
		msg.Parts = append(msg.Parts, call)
		msg.FinishReason = finishReason("tool_calls")
	} else if completion != "" {
		msg.Parts = append(msg.Parts, part(textPart(completion)))
	}
	return OutputMessages{msg}
}

func openRouterToolCall(completion string, tools any) (Part, bool) {
	list, _ := tools.([]any)
	for _, item := range list {
		tool, _ := item.(map[string]any)
		fn, _ := tool["function"].(map[string]any)
		name := stringOf(fn["name"])
		if name == "" || !strings.HasPrefix(completion, name) {
			continue
		}
		args, ok := decode(strings.TrimPrefix(completion, name)).(map[string]any)
		if !ok {
			continue
		}
		return part(ToolCallRequestPart{Type: PartTypeToolCall, Name: name, Arguments: args}), true
	}
	return Part{}, false
}
