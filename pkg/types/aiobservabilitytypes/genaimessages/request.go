package genaimessages

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// convertChatRequest handles OpenAI, Anthropic, Vercel, Gemini and LangChain request objects.
func convertChatRequest(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	conversation, ok := lookup(m, "messages", "input", "contents", "prompt")
	if !ok || !isConversation(m, conversation) {
		return nil, false
	}

	messages := []aiobservabilitytypes.Message{}
	if system := systemMessage(firstOf(m, "system", "instructions", "system_instruction", "systemInstruction", "system_prompt")); system != nil {
		messages = append(messages, *system)
	} else if config, ok := m["config"].(map[string]any); ok {
		if system := systemMessage(firstOf(config, "system_instruction", "systemInstruction")); system != nil {
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
		messages = append(messages, textMessage(aiobservabilitytypes.MessageRoleUser, c))
	case []any:
		for _, item := range flattenOnce(c) {
			if s, isString := item.(string); isString {
				messages = append(messages, textMessage(aiobservabilitytypes.MessageRoleUser, s))
				continue
			}
			messages = append(messages, semconvMessage(asMap(item), aiobservabilitytypes.MessageRoleUser)...)
		}
	case map[string]any:
		messages = append(messages, semconvMessage(c, aiobservabilitytypes.MessageRoleUser)...)
	default:
		return nil, false
	}
	return messages, true
}

// isConversation rejects embeddings requests.
func isConversation(m map[string]any, conversation any) bool {
	if _, isRequestInput := m["input"]; !isRequestInput {
		return true
	}
	if _, hasChatKey := lookup(m, "instructions", "tools", "tool_choice", "parallel_tool_calls", "previous_response_id"); hasChatKey {
		return true
	}
	list, ok := conversation.([]any)
	if !ok {
		return false
	}
	for _, item := range list {
		if _, isMap := item.(map[string]any); !isMap {
			return false
		}
	}
	return true
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
		parts, ok := v["parts"].([]any)
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
