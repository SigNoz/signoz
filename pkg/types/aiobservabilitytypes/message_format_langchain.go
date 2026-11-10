package aiobservabilitytypes

import "github.com/SigNoz/signoz/pkg/valuer"

// Format: LangChain's serialised run inputs and outputs, {messages: [[Serializable]]} and
// {generations: [[{text, generation_info, message}]]}, each message {lc: 1, type: "constructor",
// id: [..., class], kwargs: {content, tool_calls, tool_call_id, name, ...}}:
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/load/serializable.py#L297
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/outputs/llm_result.py#L23
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/ai.py#L170
// Written by: the LangSmith OTel exporter as gen_ai.prompt and gen_ai.completion, which the span mapper
// moves onto gen_ai.input.messages and gen_ai.output.messages:
// https://github.com/langchain-ai/langsmith-sdk/blob/bf325f3a0d9f415096a4632099b7faff355cde53/python/langsmith/_internal/otel/_otel_exporter.py#L761
// https://github.com/langchain-ai/langsmith-sdk/blob/bf325f3a0d9f415096a4632099b7faff355cde53/python/langsmith/_internal/otel/_otel_exporter.py#L843
// The envelope and the message classes are langchain_core's and shared by every partner package; the
// partners differ in the key that carries the finish reason and in the content blocks they keep.
// Handled: string content, langchain_core's standard content blocks and the OpenAI block spellings,
// tool_calls, tool messages, the finish reason of a generation.
// Not yet: the provider-native thinking blocks anthropic, bedrock and google keep in the content, kept
// as sent:
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/partners/anthropic/langchain_anthropic/chat_models.py#L866
// https://github.com/langchain-ai/langchain-aws/blob/910b79b9787eee773cde65bdd9e94266d6cf6f6c/libs/aws/langchain_aws/chat_models/bedrock_converse.py#L401
// https://github.com/langchain-ai/langchain-google/blob/9f72e9a344235a488396ac2c62d360ceb2b1c81c/libs/genai/langchain_google_genai/chat_models.py#L165

// LangChain message classes to roles; ChatMessage carries its own role in kwargs.
var langChainRoles = map[string]Role{
	"SystemMessage": RoleSystem, "SystemMessageChunk": RoleSystem,
	"HumanMessage": RoleUser, "HumanMessageChunk": RoleUser,
	"AIMessage": RoleAssistant, "AIMessageChunk": RoleAssistant,
	"ToolMessage": RoleTool, "ToolMessageChunk": RoleTool, "FunctionMessage": RoleTool, "FunctionMessageChunk": RoleTool,
}

// isLangChainRun looks for the generations list or a messages batch of serialised messages.
func isLangChainRun(m map[string]any) bool {
	if _, ok := m["generations"].([]any); ok {
		return true
	}
	batches, ok := m["messages"].([]any)
	if !ok || len(batches) == 0 {
		return false
	}
	first, ok := batches[0].([]any)
	if !ok {
		return false
	}
	msg, ok := firstObject(first)
	return ok && msg["lc"] != nil
}

// langChainRun converts the run inputs, every batch of messages in order, or the run outputs, one
// message per generation.
func (f *formatting) langChainRun(m map[string]any) OutputMessages {
	var out OutputMessages
	if batches, ok := m["messages"].([]any); ok {
		for _, batch := range batches {
			if list, ok := batch.([]any); ok {
				out = append(out, f.langChainMessages(list)...)
			}
		}
		return out
	}
	batches, _ := m["generations"].([]any)
	for _, batch := range batches {
		list, _ := batch.([]any)
		for _, item := range list {
			generation, ok := item.(map[string]any)
			if !ok {
				out = append(out, genericMessage(item))
				continue
			}
			msg := OutputMessage{Role: RoleAssistant, Parts: Parts{}}
			if message, ok := generation["message"].(map[string]any); ok {
				msg = f.langChainMessage(message)
			} else if text := stringOf(generation["text"]); text != "" {
				msg.Parts = Parts{part(textPart(text))}
			}
			if info, ok := generation["generation_info"].(map[string]any); ok && msg.FinishReason == nil {
				msg.FinishReason = finishReason(stringOf(info["finish_reason"]))
			}
			out = append(out, msg)
		}
	}
	return out
}

func (f *formatting) langChainMessages(list []any) OutputMessages {
	out := make(OutputMessages, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		if !ok {
			out = append(out, genericMessage(item))
			continue
		}
		out = append(out, f.langChainMessage(m))
	}
	return out
}

// langChainMessage converts one serialised message. A tool_call or tool_use block in the content repeats
// a call that tool_calls already carries, langchain_core adds the former from the latter and
// langchain-anthropic keeps the provider's block beside it:
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/ai.py#L274
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/partners/anthropic/langchain_anthropic/chat_models.py#L2571
// A failed call leaves the error body in response_metadata.
func (f *formatting) langChainMessage(m map[string]any) OutputMessage {
	kwargs, _ := m["kwargs"].(map[string]any)
	msg := OutputMessage{Role: langChainRole(m, kwargs), Parts: Parts{}, Name: optionalString(kwargs["name"])}
	if id := stringOf(kwargs["tool_call_id"]); msg.Role == RoleTool && id != "" {
		msg.Parts = Parts{part(ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: &id, Response: toolResponse(kwargs["content"])})}
		return msg
	}
	calls, _ := kwargs["tool_calls"].([]any)
	switch content := kwargs["content"].(type) {
	case string:
		if content != "" {
			msg.Parts = append(msg.Parts, part(textPart(content)))
		}
	case []any:
		for _, item := range content {
			if block, ok := item.(map[string]any); ok && len(calls) > 0 && (block["type"] == "tool_call" || block["type"] == "tool_use") {
				continue
			}
			msg.Parts = append(msg.Parts, langChainBlock(item))
		}
	}
	for _, item := range calls {
		if call, ok := item.(map[string]any); ok {
			msg.Parts = append(msg.Parts, part(ToolCallRequestPart{Type: PartTypeToolCall, Name: stringOf(call["name"]), ID: optionalString(call["id"]), Arguments: decode(call["args"])}))
		}
	}
	if metadata, ok := kwargs["response_metadata"].(map[string]any); ok {
		msg.FinishReason = langChainFinishReason(metadata)
		if body, ok := metadata["body"].(map[string]any); ok && body["error"] != nil {
			msg.FinishReason = finishReason("error")
		}
	}
	return msg
}

// langChainFinishReason reads the key each partner writes into response_metadata: finish_reason for
// most, stop_reason for anthropic, stopReason for bedrock, done_reason for ollama:
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/partners/anthropic/langchain_anthropic/chat_models.py#L2510
// https://github.com/langchain-ai/langchain-aws/blob/910b79b9787eee773cde65bdd9e94266d6cf6f6c/libs/aws/langchain_aws/chat_models/bedrock_converse.py#L265
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/partners/ollama/langchain_ollama/chat_models.py#L24
func langChainFinishReason(metadata map[string]any) *FinishReason {
	for _, key := range []string{"finish_reason", "stop_reason", "stopReason", "done_reason"} {
		if fr := finishReason(stringOf(metadata[key])); fr != nil {
			return fr
		}
	}
	return nil
}

// langChainBlock converts one content block: langchain_core's standard reasoning and media blocks, else
// the OpenAI spellings contentPart knows:
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/content.py#L456
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/content.py#L498
func langChainBlock(item any) Part {
	block, ok := item.(map[string]any)
	if !ok {
		return contentPart(item)
	}
	typ := stringOf(block["type"])
	switch typ {
	case "reasoning":
		return part(ReasoningPart{Type: PartTypeReasoning, Content: stringOf(block["reasoning"])})
	case "image", "audio", "video", "file":
		modality := Modality{valuer.NewString(typ)}
		if typ == "file" {
			modality = ModalityDocument
		}
		mime := optionalString(block["mime_type"])
		switch {
		case stringOf(block["url"]) != "":
			return part(mediaPart(stringOf(block["url"]), modality))
		case stringOf(block["base64"]) != "":
			return part(BlobPart{Type: PartTypeBlob, Modality: modality, MimeType: mime, Content: stringOf(block["base64"])})
		case stringOf(block["file_id"]) != "":
			return part(FilePart{Type: PartTypeFile, Modality: modality, MimeType: mime, FileID: stringOf(block["file_id"])})
		}
	}
	return contentPart(item)
}

// langChainRole reads the message class from the serialised id path, falling back to the type
// alias in kwargs:
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/chat.py#L18
// https://github.com/langchain-ai/langchain/blob/84ba23c414eca6bf6f6ebd1394a3006378113540/libs/core/langchain_core/messages/human.py#L29
func langChainRole(m, kwargs map[string]any) Role {
	if id, ok := m["id"].([]any); ok && len(id) > 0 {
		class := stringOf(id[len(id)-1])
		if r, ok := langChainRoles[class]; ok {
			return r
		}
		if class == "ChatMessage" || class == "ChatMessageChunk" {
			return role(stringOf(kwargs["role"]))
		}
	}
	return role(stringOf(kwargs["type"]))
}
