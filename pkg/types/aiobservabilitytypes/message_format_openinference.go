package aiobservabilitytypes

import "github.com/SigNoz/signoz/pkg/valuer"

// Format: the flattened llm.input_messages.N.message.* and llm.output_messages.N.message.* keys
// (Arize-ai/openinference@12f2cc03, spec/semantic_conventions.md, spec/tool_calling.md,
// spec/multimodal_attributes.md), the provider-neutral copy of the conversation every OpenInference
// instrumentation writes; the raw provider request the mapper moved onto gen_ai.*.messages is the
// fallback for a side without them.
// Handled: message.content, the ordered message.contents items of every type the spec names (text,
// image, audio, video, reasoning, tool_use), message.tool_calls, the legacy message.function_call_*,
// tool results, llm.finish_reason.
// Dropped: reasoning id, signature, data and encrypted_content; audio transcripts.

const (
	openInferenceInputMessages  = "llm.input_messages"
	openInferenceOutputMessages = "llm.output_messages"
	openInferenceFinishReason   = "llm.finish_reason"
)

func (f *formatting) openInference() bool {
	input := indexed(f.attrs, openInferenceInputMessages)
	output := indexed(f.attrs, openInferenceOutputMessages)
	if len(input) == 0 && len(output) == 0 {
		return false
	}

	inputLabel, outputLabel := FormatterOpenInference, FormatterOpenInference
	if len(input) > 0 {
		f.out.Input = inputMessages(f.openInferenceMessages(input))
	} else if raw := f.attr(GenAIInputMessages); raw != nil {
		var msgs OutputMessages
		msgs, inputLabel = f.side(decode(raw), RoleUser)
		f.out.Input = inputMessages(msgs)
	}
	if len(output) > 0 {
		f.out.Output = f.openInferenceMessages(output)
		if fr := finishReason(stringOf(f.attr(openInferenceFinishReason))); fr != nil {
			for i := range f.out.Output {
				f.out.Output[i].FinishReason = fr
			}
		}
	} else if raw := f.attr(GenAIOutputMessages); raw != nil {
		f.out.Output, outputLabel = f.side(decode(raw), RoleAssistant)
	}
	f.label(inputLabel, outputLabel)
	return true
}

// openInferenceMessages converts the message buckets, folding runs of assistant messages into one and
// dropping messages without parts: the Responses path writes one message per output item, including
// an empty one for a reasoning item without a summary.
func (f *formatting) openInferenceMessages(buckets []map[string]any) OutputMessages {
	out := make(OutputMessages, 0, len(buckets))
	for _, bucket := range buckets {
		message, _ := bucket["message"].(map[string]any)
		msg := f.openInferenceMessage(message)
		if len(out) > 0 && msg.Role == RoleAssistant && out[len(out)-1].Role == RoleAssistant {
			out[len(out)-1].Parts = append(out[len(out)-1].Parts, msg.Parts...)
			continue
		}
		if len(msg.Parts) == 0 {
			continue
		}
		out = append(out, msg)
	}
	return out
}

// openInferenceMessage converts one message.* object. A tool message's content is its tool call
// response; otherwise message.content, the ordered message.contents and the tool calls are parts.
func (f *formatting) openInferenceMessage(m map[string]any) OutputMessage {
	msg := OutputMessage{Role: role(stringOf(m["role"])), Parts: Parts{}, Name: optionalString(m["name"])}
	content, hasContent := m["content"]
	contentText := stringOf(content)

	if id := stringOf(m["tool_call_id"]); msg.Role == RoleTool && id != "" {
		var response any
		if hasContent {
			response = decode(content)
		} else {
			response = textOf(f.openInferenceContents(m, false))
		}
		msg.Parts = Parts{part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: &id, Response: response})}
		return msg
	}

	calls := indexed(m, "tool_calls")
	msg.Parts = f.openInferenceContents(m, len(calls) == 0)
	if contentText != "" && !(len(msg.Parts) == 1 && textOf(msg.Parts) == contentText) {
		msg.Parts = append(Parts{part(textPart(contentText))}, msg.Parts...)
	}
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

// openInferenceContents converts the ordered message.contents items. A tool_use item repeats a call
// from message.tool_calls, so it is converted only when the message has no tool_calls.
func (f *formatting) openInferenceContents(m map[string]any, keepToolUse bool) Parts {
	items := indexed(m, "contents")
	parts := make(Parts, 0, len(items))
	for _, item := range items {
		content, _ := item["message_content"].(map[string]any)
		typ := stringOf(content["type"])
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
			if call, ok := item["tool_call"].(map[string]any); ok && keepToolUse {
				parts = append(parts, openInferenceToolCall(call))
			}
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
