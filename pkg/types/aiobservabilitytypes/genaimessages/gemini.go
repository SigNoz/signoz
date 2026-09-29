package genaimessages

import (
	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// convertGeminiResponse handles Gemini {candidates} and Google ADK {content} responses.
func convertGeminiResponse(value any) ([]aiobservabilitytypes.Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	if content, ok := m["content"].(map[string]any); ok {
		if _, hasParts := content["parts"]; hasParts {
			return withFinishReason(semconvMessage(content, aiobservabilitytypes.MessageRoleAssistant), finishReasonOf(m)), true
		}
	}
	candidates, ok := m["candidates"].([]any)
	if !ok {
		return nil, false
	}
	messages := make([]aiobservabilitytypes.Message, 0, len(candidates))
	for _, c := range candidates {
		candidate := asMap(c)
		content, ok := candidate["content"].(map[string]any)
		if !ok {
			messages = append(messages, aiobservabilitytypes.Message{Role: aiobservabilitytypes.MessageRoleAssistant, Content: []aiobservabilitytypes.Part{genericPart(candidate)}})
			continue
		}
		messages = append(messages, withFinishReason(semconvMessage(content, aiobservabilitytypes.MessageRoleAssistant), finishReasonOf(candidate))...)
	}
	return messages, true
}
