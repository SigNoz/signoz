package genaimessages

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// convertSemconvMessages handles [{role, parts, finish_reason}] and Gemini contents.
func convertSemconvMessages(value any) ([]aiobservabilitytypes.Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	first, ok := toObject(firstItem(list))
	if !ok {
		return nil, false
	}
	if ok := first.has("parts"); !ok {
		return nil, false
	}

	messages := make([]aiobservabilitytypes.Message, 0, len(list))
	for _, item := range list {
		m, ok := toObject(item)
		if !ok {
			messages = append(messages, genericMessages(stringOf(item))...)
			continue
		}
		messages = append(messages, semconvMessage(m, "")...)
	}
	return messages, true
}

// convertChatMessageList handles OpenAI, Anthropic, Vercel and LangChain message lists.
func convertChatMessageList(value any) ([]aiobservabilitytypes.Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	if !isChatMessage(firstItem(list)) {
		return nil, false
	}
	messages := make([]aiobservabilitytypes.Message, 0, len(list))
	for _, item := range list {
		messages = append(messages, chatMessage(item, "")...)
	}
	return messages, true
}

func isChatMessage(value any) bool {
	m, ok := toObject(value)
	if !ok {
		return false
	}
	if ok := m.has("role"); ok {
		return true
	}
	switch typ := m.str("type"); typ {
	case "message", "reasoning", "human", "ai", "tool", "system":
		return true
	case "constructor":
		ok := m.has("kwargs")
		return ok
	default:
		return isResponsesItemType(typ)
	}
}

// convertToolCallList handles a bare tool call list, e.g. Vercel ai.response.toolCalls.
func convertToolCallList(value any) ([]aiobservabilitytypes.Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	msg := aiobservabilitytypes.Message{Role: aiobservabilitytypes.MessageRoleAssistant, Content: make([]aiobservabilitytypes.Part, 0, len(list))}
	for _, item := range list {
		call, ok := toObject(item)
		if !ok || !isToolCall(call) {
			return nil, false
		}
		msg.Content = append(msg.Content, toolCallPart(call))
	}
	return []aiobservabilitytypes.Message{msg}, true
}

// isToolCall rejects tool definitions, which carry no arguments.
func isToolCall(call object) bool {
	if has := call.has("toolName"); has {
		return true
	}
	if fn, ok := call.obj("function"); ok {
		has := fn.has("arguments")
		return has
	}
	if has := call.has("name"); !has {
		return false
	}
	_, has := call.lookup("arguments", "args")
	return has
}

// convertChatRequest handles OpenAI, Anthropic, Vercel, Gemini and LangChain request objects.
func convertChatRequest(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := toObject(value)
	if !ok {
		return nil, false
	}
	conversation, ok := m.lookup("messages", "input", "contents", "prompt")
	if !ok {
		return nil, false
	}

	messages := []aiobservabilitytypes.Message{}
	if system := systemMessage(m.first("system", "instructions", "system_instruction", "systemInstruction", "system_prompt")); system != nil {
		messages = append(messages, *system)
	} else if config, ok := m.obj("config"); ok {
		if system := systemMessage(config.first("system_instruction", "systemInstruction")); system != nil {
			messages = append(messages, *system)
		}
	}

	// {messages: "[...]"}: the list arrives JSON-encoded once more from some SDKs
	if s, isString := conversation.(string); isString {
		var decoded any
		if err := json.Unmarshal([]byte(s), &decoded); err == nil {
			if _, isList := decoded.([]any); isList {
				conversation = decoded
			}
		}
	}
	switch c := conversation.(type) {
	case string:
		if c != "" {
			messages = append(messages, textMessage(aiobservabilitytypes.MessageRoleUser, c))
		}
	case []any:
		for _, item := range flattenOnce(c) {
			if s, isString := item.(string); isString {
				messages = append(messages, textMessage(aiobservabilitytypes.MessageRoleUser, s))
				continue
			}
			messages = append(messages, semconvMessage(asObject(item), aiobservabilitytypes.MessageRoleUser)...)
		}
	case map[string]any:
		messages = append(messages, semconvMessage(c, aiobservabilitytypes.MessageRoleUser)...)
	default:
		return nil, false
	}
	return messages, true
}

// systemMessage returns nil when value is empty or unknown.
func systemMessage(value any) *aiobservabilitytypes.Message {
	msg := aiobservabilitytypes.Message{Role: aiobservabilitytypes.MessageRoleSystem, Content: []aiobservabilitytypes.Part{}}
	switch v := value.(type) {
	case string:
		if v == "" {
			return nil
		}
		msg.Content = append(msg.Content, textPart(v))
	case []any:
		for _, item := range v {
			msg.Content = append(msg.Content, contentBlockPart(item))
		}
	case map[string]any:
		parts, ok := object(v).list("parts")
		if !ok {
			return nil
		}
		for _, p := range parts {
			msg.Content = append(msg.Content, semconvPart(p))
		}
	default:
		return nil
	}
	if len(msg.Content) == 0 {
		return nil
	}
	return &msg
}

// convertChatResponse handles the OpenAI Chat Completions {choices} response.
func convertChatResponse(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := toObject(value)
	if !ok {
		return nil, false
	}
	choices, ok := m.list("choices")
	if !ok {
		return nil, false
	}
	messages := make([]aiobservabilitytypes.Message, 0, len(choices))
	for _, c := range choices {
		choice := asObject(c)
		var converted []aiobservabilitytypes.Message
		if message, ok := toObject(choice.first("message", "delta")); ok {
			converted = chatMessage(message, aiobservabilitytypes.MessageRoleAssistant)
		} else if text, ok := choice.get("text"); ok {
			converted = []aiobservabilitytypes.Message{textMessage(aiobservabilitytypes.MessageRoleAssistant, stringOf(text))}
		} else {
			converted = []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{genericPart(choice)}}}
		}
		messages = append(messages, withFinishReason(converted, choice.str("finish_reason"))...)
	}
	return messages, true
}

func convertResponsesAPIResponse(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := toObject(value)
	if !ok {
		return nil, false
	}
	output, ok := m.list("output")
	if !ok {
		return nil, false
	}
	messages := make([]aiobservabilitytypes.Message, 0, len(output))
	for _, item := range output {
		messages = append(messages, chatMessage(item, aiobservabilitytypes.MessageRoleAssistant)...)
	}
	if last := lastMessage(messages); last != nil && last.FinishReason == "" {
		if details, ok := m.obj("incomplete_details"); ok {
			last.FinishReason = normalizeFinishReason(details.str("reason"))
		} else if m.str("status") == "completed" {
			last.FinishReason = aiobservabilitytypes.FinishReasonStop
		}
	}
	return messages, true
}

// convertGeminiResponse handles Gemini {candidates} and Google ADK {content} responses.
func convertGeminiResponse(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := toObject(value)
	if !ok {
		return nil, false
	}
	if content, ok := m.obj("content"); ok {
		if hasParts := content.has("parts"); hasParts {
			return withFinishReason(semconvMessage(content, aiobservabilitytypes.MessageRoleAssistant), finishReasonOf(m)), true
		}
	}
	candidates, ok := m.list("candidates")
	if !ok {
		return nil, false
	}
	messages := make([]aiobservabilitytypes.Message, 0, len(candidates))
	for _, c := range candidates {
		candidate := asObject(c)
		content, ok := candidate.obj("content")
		if !ok {
			generic := []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{genericPart(candidate)}}}
			messages = append(messages, withFinishReason(generic, finishReasonOf(candidate))...)
			continue
		}
		messages = append(messages, withFinishReason(semconvMessage(content, aiobservabilitytypes.MessageRoleAssistant), finishReasonOf(candidate))...)
	}
	return messages, true
}

func convertLegacyCompletion(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := toObject(value)
	if !ok {
		return nil, false
	}
	completion, ok := m.text("completion")
	if !ok {
		return nil, false
	}
	msg := aiobservabilitytypes.Message{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{}}
	if reasoning, ok := m.text("reasoning"); ok && reasoning != "" {
		msg.Content = append(msg.Content, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: reasoning})
	}
	msg.Content = append(msg.Content, textPart(completion))
	return []aiobservabilitytypes.Message{msg}, true
}

func convertLangChainGenerations(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := toObject(value)
	if !ok {
		return nil, false
	}
	generations, ok := m.list("generations")
	if !ok {
		return nil, false
	}
	messages := []aiobservabilitytypes.Message{}
	for _, g := range flattenOnce(generations) {
		gen := asObject(g)
		var converted []aiobservabilitytypes.Message
		if message, ok := gen.obj("message"); ok {
			converted = chatMessage(message, aiobservabilitytypes.MessageRoleAssistant)
		} else {
			converted = []aiobservabilitytypes.Message{textMessage(aiobservabilitytypes.MessageRoleAssistant, gen.str("text"))}
		}
		messages = append(messages, withFinishReason(converted, asObject(gen.at("generation_info")).str("finish_reason"))...)
	}
	return messages, true
}

// withFinishReason sets reason on the last message that has none.
func withFinishReason(messages []aiobservabilitytypes.Message, reason string) []aiobservabilitytypes.Message {
	if last := lastMessage(messages); last != nil && last.FinishReason == "" {
		last.FinishReason = normalizeFinishReason(reason)
	}
	return messages
}
