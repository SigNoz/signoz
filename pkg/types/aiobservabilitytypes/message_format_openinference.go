package aiobservabilitytypes

import "github.com/SigNoz/signoz/pkg/valuer"

// Format: the flattened llm.input_messages.N.message.* and llm.output_messages.N.message.* keys, the
// provider-neutral copy of the conversation the OpenInference instrumentations write on LLM spans. A side
// without them, or whose buckets hold no message, falls back to the raw provider payload the mapper moved
// onto gen_ai.*.messages; pipecat streams the reply into output.value alone, LiteLLM's OpenInference mode
// leaves the output bucket empty on a tool-calling turn.
// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/semantic_conventions.md#L77
// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/tool_calling.md#L37
// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/multimodal_attributes.md#L35
// https://github.com/Arize-ai/openinference/blob/12f2cc035edfb00b60b656d977f07abfb7a69900/spec/llm_spans.md#L181
// Handled: message.content, the ordered message.contents items (text, image, audio, video, reasoning),
// message.tool_calls, the legacy message.function_call_*, tool results, llm.finish_reason. A tool_use
// content item repeats a call from message.tool_calls and is skipped.
// Dropped: reasoning id, signature, data and encrypted_content; audio transcripts.

const (
	openInferenceInputMessages  = "llm.input_messages"
	openInferenceOutputMessages = "llm.output_messages"
	openInferenceFinishReason   = "llm.finish_reason"
)

func (f *formatting) openInference() bool {
	input := indexed(f.attributes, openInferenceInputMessages)
	output := indexed(f.attributes, openInferenceOutputMessages)
	if len(input) == 0 && len(output) == 0 {
		return false
	}
	inputLabel, outputLabel := FormatterOpenInference, FormatterOpenInference
	if msgs := openInferenceMessages(input); len(msgs) > 0 {
		f.out.Input = inputMessages(msgs)
	} else if raw := attribute(f.attributes, GenAIInputMessages); raw != nil {
		msgs, inputLabel = f.side(decode(raw), RoleUser)
		f.out.Input = inputMessages(msgs)
	}
	if msgs := openInferenceMessages(output); len(msgs) > 0 {
		f.out.Output = msgs
		if fr := finishReason(stringOf(attribute(f.attributes, openInferenceFinishReason))); fr != nil {
			for i := range f.out.Output {
				f.out.Output[i].FinishReason = fr
			}
		}
	} else if raw := attribute(f.attributes, GenAIOutputMessages); raw != nil {
		f.out.Output, outputLabel = f.side(decode(raw), RoleAssistant)
	}
	f.warnMixedFormats(inputLabel, outputLabel)
	return true
}

// openInferenceMessages converts the message buckets and folds runs of assistant messages: the Responses
// path writes one message per output item, an empty one for a reasoning item without a summary.
func openInferenceMessages(buckets []map[string]any) OutputMessages {
	msgs := make(OutputMessages, 0, len(buckets))
	for _, bucket := range buckets {
		message, _ := bucket["message"].(map[string]any)
		msgs = append(msgs, openInferenceMessage(message))
	}
	return foldAssistant(msgs)
}

// openInferenceMessage converts one message.* object. A message without a role is a tool response when
// it has a tool_call_id, an assistant turn when it has tool calls, else a user turn, as the
// collector-contrib normalizer decides it:
// https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/fc79b95297776dec6c47490cd6f6026b942bf6fb/processor/genainormalizerprocessor/internal/openinference/messages.go#L473
func openInferenceMessage(m map[string]any) OutputMessage {
	msg := OutputMessage{Role: role(stringOf(m["role"])), Parts: Parts{}, Name: optionalString(m["name"])}
	id := stringOf(m["tool_call_id"])
	calls := indexed(m, "tool_calls")
	if msg.Role.IsZero() {
		switch {
		case id != "":
			msg.Role = RoleTool
		case len(calls) > 0:
			msg.Role = RoleAssistant
		default:
			msg.Role = RoleUser
		}
	}
	if msg.Role == RoleTool && id != "" {
		msg.Parts = Parts{part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: &id, Response: decode(m["content"])})}
		return msg
	}
	if content := stringOf(m["content"]); content != "" {
		msg.Parts = append(msg.Parts, part(textPart(content)))
	}
	msg.Parts = append(msg.Parts, openInferenceContents(m)...)
	for _, call := range calls {
		if c, ok := call["tool_call"].(map[string]any); ok {
			msg.Parts = append(msg.Parts, openInferenceToolCall(c))
		}
	}
	if name := stringOf(m["function_call_name"]); name != "" {
		msg.Parts = append(msg.Parts, part(ToolCallRequestPart{Type: PartTypeToolCall, Name: name, Arguments: decode(m["function_call_arguments_json"])}))
	}
	return msg
}

// openInferenceContents converts the ordered message.contents items. A text item may come without
// message_content.type, as the collector-contrib normalizer reads it:
// https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/fc79b95297776dec6c47490cd6f6026b942bf6fb/processor/genainormalizerprocessor/internal/openinference/messages.go#L285
func openInferenceContents(m map[string]any) Parts {
	items := indexed(m, "contents")
	parts := make(Parts, 0, len(items))
	for _, item := range items {
		content, _ := item["message_content"].(map[string]any)
		typ := stringOf(content["type"])
		if typ == "" && content["text"] != nil {
			typ = "text"
		}
		switch typ {
		case "text":
			parts = append(parts, part(textPart(stringOf(content["text"]))))
		case "reasoning":
			parts = append(parts, part(ReasoningPart{Type: PartTypeReasoning, Content: stringOf(content["text"])}))
		case "image", "audio", "video":
			if url := stringOf(attribute(content, typ+"."+typ+".url")); url != "" {
				parts = append(parts, part(mediaPart(url, Modality{valuer.NewString(typ)})))
			}
		case "tool_use":
		default:
			parts = append(parts, part(GenericPart(content)))
		}
	}
	return parts
}

// openInferenceToolCall reads a tool_call.* object, {id, function: {name, arguments}}.
func openInferenceToolCall(call map[string]any) Part {
	fn, _ := call["function"].(map[string]any)
	p := ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(fn["name"]), ID: optionalString(call["id"])}
	if args, ok := fn["arguments"]; ok {
		p.Arguments = decode(args)
	}
	return part(p)
}
