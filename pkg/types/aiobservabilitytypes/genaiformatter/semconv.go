package genaiformatter

import (
	"encoding/json"
	"maps"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes/genai"
)

// Format: the OTel shape itself, [{role, parts}].
// Written by: litellm, langchain, openllmetry, portkey, traceloop LLM spans.
// Decoding is the genai types. Repairs: "text" used for "content" on text parts; OpenAI content
// blocks left inside parts.
// Not yet: "thinking" for "reasoning"; "result" or "output" for "response" on tool call responses.

// semconv decodes messages that already follow the schema through the genai types. A part of a
// type the schema does not name is a provider content block, which contentPart converts.
func (f *formatting) semconv(list []any) genai.OutputMessages {
	data, err := json.Marshal(semconvTextKey(list))
	if err != nil {
		f.warn("messages could not be encoded: %s", err)
		return genai.OutputMessages{genericMessage(list)}
	}
	var msgs genai.OutputMessages
	if err := json.Unmarshal(data, &msgs); err != nil {
		f.warn("messages do not follow the schema: %s", err)
		return genai.OutputMessages{genericMessage(list)}
	}
	for i := range msgs {
		if msgs[i].Parts == nil {
			msgs[i].Parts = genai.Parts{}
		}
		for j, p := range msgs[i].Parts {
			if block, ok := p.Value.(genai.GenericPart); ok {
				msgs[i].Parts[j] = contentPart(map[string]any(block))
			}
		}
	}
	return msgs
}

// semconvTextKey copies the text and reasoning parts some SDKs write with "text" in place of the
// schema's "content". The input is left untouched, it is also the span's raw attribute.
func semconvTextKey(list []any) []any {
	out := make([]any, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		parts, hasParts := object(m).list("parts")
		if !ok || !hasParts {
			out = append(out, item)
			continue
		}
		fixedParts := make([]any, 0, len(parts))
		for _, p := range parts {
			part, ok := p.(map[string]any)
			typ := object(part).str("type")
			if ok && (typ == "text" || typ == "reasoning") && part["content"] == nil && part["text"] != nil {
				fixed := maps.Clone(part)
				fixed["content"] = fixed["text"]
				delete(fixed, "text")
				p = fixed
			}
			fixedParts = append(fixedParts, p)
		}
		msg := maps.Clone(m)
		msg["parts"] = fixedParts
		out = append(out, msg)
	}
	return out
}
