package aiobservabilitytypes

import (
	"encoding/json"
	"maps"
)

// Format: the OTel shape itself, [{role, parts}].
// Written by: litellm, langchain, openllmetry, portkey, traceloop LLM spans, pydantic-ai.
// Decoding is the genai types. Repairs: "text" used for "content" on text parts; OpenAI content blocks
// left inside parts; tool call arguments as a JSON string and "result" for "response", as pydantic-ai
// writes them:
// https://github.com/pydantic/pydantic-ai/blob/9ac853bb84ffed7ba0edccb026c5b4f3228c1de7/pydantic_ai_slim/pydantic_ai/messages.py#L3130
// https://github.com/pydantic/pydantic-ai/blob/9ac853bb84ffed7ba0edccb026c5b4f3228c1de7/pydantic_ai_slim/pydantic_ai/messages.py#L1724
// The choice finish_reason as the provider spells it, as litellm copies it:
// https://github.com/BerriAI/litellm/blob/9d72bae336ec0d14c41651adcb0d2e1149721f46/litellm/integrations/opentelemetry.py#L2822
// Not yet: "thinking" for "reasoning".

// semconv decodes messages that already follow the schema through the genai types. A part of a
// type the schema does not name is a provider content block, which contentPart converts.
func (f *formatting) semconv(list []any) OutputMessages {
	data, err := json.Marshal(semconvRepairs(list))
	if err != nil {
		f.warn("messages could not be encoded: %s", err)
		return OutputMessages{genericMessage(list)}
	}
	var msgs OutputMessages
	if err := json.Unmarshal(data, &msgs); err != nil {
		f.warn("messages do not follow the schema: %s", err)
		return OutputMessages{genericMessage(list)}
	}
	for i := range msgs {
		if msgs[i].Parts == nil {
			msgs[i].Parts = Parts{}
		}
		if msgs[i].FinishReason != nil {
			msgs[i].FinishReason = finishReason(msgs[i].FinishReason.StringValue())
		}
		for j, p := range msgs[i].Parts {
			if block, ok := p.Value.(GenericPart); ok {
				msgs[i].Parts[j] = contentPart(map[string]any(block))
			}
		}
	}
	return msgs
}

// semconvRepairs copies the parts whose keys SDKs misspell into the schema's spelling. The input
// is left untouched, it is also the span's raw attribute.
func semconvRepairs(list []any) []any {
	out := make([]any, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		parts, hasParts := m["parts"].([]any)
		if !ok || !hasParts {
			out = append(out, item)
			continue
		}
		fixedParts := make([]any, 0, len(parts))
		for _, p := range parts {
			if part, ok := p.(map[string]any); ok {
				p = semconvRepairPart(part)
			}
			fixedParts = append(fixedParts, p)
		}
		msg := maps.Clone(m)
		msg["parts"] = fixedParts
		out = append(out, msg)
	}
	return out
}

func semconvRepairPart(part map[string]any) map[string]any {
	fixed := maps.Clone(part)
	switch stringOf(part["type"]) {
	case "text", "reasoning":
		if part["content"] == nil && part["text"] != nil {
			fixed["content"] = fixed["text"]
			delete(fixed, "text")
		}
	case "tool_call":
		if args, ok := part["arguments"].(string); ok {
			fixed["arguments"] = decode(args)
		}
	case "tool_call_response":
		if _, ok := part["response"]; !ok && part["result"] != nil {
			fixed["response"] = part["result"]
			delete(fixed, "result")
		}
	}
	return fixed
}
