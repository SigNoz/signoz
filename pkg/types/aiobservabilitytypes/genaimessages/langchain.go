package genaimessages

import (
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

func convertLangChainGenerations(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	generations, ok := m["generations"].([]any)
	if !ok {
		return nil, false
	}
	messages := []aiobservabilitytypes.Message{}
	for _, g := range flattenOnce(generations) {
		gen := asMap(g)
		var converted []aiobservabilitytypes.Message
		if message, ok := gen["message"].(map[string]any); ok {
			converted = chatMessage(message, aiobservabilitytypes.MessageRoleAssistant)
		} else {
			converted = []aiobservabilitytypes.Message{textMessage(aiobservabilitytypes.MessageRoleAssistant, stringOf(gen["text"]))}
		}
		messages = append(messages, withFinishReason(converted, stringOf(asMap(gen["generation_info"])["finish_reason"]))...)
	}
	return messages, true
}

func langChainRole(id any) aiobservabilitytypes.MessageRole {
	path, ok := id.([]any)
	if !ok || len(path) == 0 {
		return ""
	}
	switch class := stringOf(path[len(path)-1]); {
	case strings.HasPrefix(class, "System"):
		return aiobservabilitytypes.MessageRoleSystem
	case strings.HasPrefix(class, "Human"):
		return aiobservabilitytypes.MessageRoleUser
	case strings.HasPrefix(class, "AI"):
		return aiobservabilitytypes.MessageRoleAssistant
	case strings.HasPrefix(class, "Tool"), strings.HasPrefix(class, "Function"):
		return aiobservabilitytypes.MessageRoleTool
	}
	return ""
}
