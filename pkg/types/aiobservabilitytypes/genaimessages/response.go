package genaimessages

import (
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// convertChatResponse handles {choices}, {message} and {output: {message}} responses.
func convertChatResponse(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	wrapped, _ := m["message"].(map[string]any)
	if output, ok := m["output"].(map[string]any); ok && wrapped == nil {
		wrapped, _ = output["message"].(map[string]any)
	}
	if wrapped != nil {
		if !isChatMessage(wrapped) {
			return nil, false
		}
		return withFinishReason(chatMessage(wrapped, aiobservabilitytypes.MessageRoleAssistant), finishReasonOf(m)), true
	}
	choices, ok := m["choices"].([]any)
	if !ok {
		return nil, false
	}
	messages := make([]aiobservabilitytypes.Message, 0, len(choices))
	for _, c := range choices {
		choice := asMap(c)
		var converted []aiobservabilitytypes.Message
		if message, ok := firstOf(choice, "message", "delta").(map[string]any); ok {
			converted = chatMessage(message, aiobservabilitytypes.MessageRoleAssistant)
		} else if text, ok := choice["text"]; ok {
			converted = []aiobservabilitytypes.Message{textMessage(aiobservabilitytypes.MessageRoleAssistant, stringOf(text))}
		} else {
			converted = []aiobservabilitytypes.Message{{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{genericPart(choice)}}}
		}
		messages = append(messages, withFinishReason(converted, stringOf(choice["finish_reason"]))...)
	}
	return messages, true
}

func convertLegacyCompletion(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	completion, ok := m["completion"].(string)
	if !ok {
		return nil, false
	}
	msg := aiobservabilitytypes.Message{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{}}
	if reasoning, ok := m["reasoning"].(string); ok && reasoning != "" {
		msg.Content = append(msg.Content, aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeThinking, Content: reasoning})
	}
	msg.Content = append(msg.Content, textPart(completion))
	return []aiobservabilitytypes.Message{msg}, true
}
