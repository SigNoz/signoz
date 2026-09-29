package genaimessages

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// Ordered by specificity: earlier converters never match a later format.
var converters = []converter{
	convertSemconvMessages,
	convertChatMessageList,
	convertToolCallList,
	convertContentBlockList,
	convertChatRequest,
	convertChatResponse,
	convertResponsesAPIResponse,
	convertGeminiResponse,
	convertLegacyCompletion,
	convertLangChainGenerations,
	convertMessageObject,
}

var finishReasonKeys = []string{"finish_reason", "finishReason", "stop_reason", "stopReason", "done_reason"}

// Normalize converts a gen_ai.*.messages value, a JSON string or a
// decoded value; unknown formats become one generic part holding the original.
func Normalize(raw any) []aiobservabilitytypes.Message {
	var (
		value    any
		original string
	)
	switch v := raw.(type) {
	case nil:
		return []aiobservabilitytypes.Message{}
	case string:
		original = v
		if err := json.Unmarshal([]byte(v), &value); err != nil {
			return genericMessages(original)
		}
	default:
		value = v
		original = stringOf(v)
	}

	if list, ok := value.([]any); ok {
		if len(list) == 0 {
			return []aiobservabilitytypes.Message{}
		}
		// [[...]]: some SDKs wrap the conversation in one more list
		if _, nested := list[0].([]any); nested {
			value = flattenOnce(list)
		}
		// ["{...}", "{...}"]: an array attribute holding one JSON message per element
		if decoded, ok := decodeJSONStrings(list); ok {
			value = decoded
		}
	}
	for _, convert := range converters {
		if messages, ok := convert(value); ok {
			return messages
		}
	}
	return genericMessages(original)
}

type converter func(value any) (messages []aiobservabilitytypes.Message, ok bool)

func genericMessages(content string) []aiobservabilitytypes.Message {
	return []aiobservabilitytypes.Message{{Content: []aiobservabilitytypes.Part{genericPart(content)}}}
}

// withFinishReason sets reason on the last message that has none.
func withFinishReason(messages []aiobservabilitytypes.Message, reason string) []aiobservabilitytypes.Message {
	if len(messages) == 0 {
		return messages
	}
	last := &messages[len(messages)-1]
	if last.FinishReason == "" {
		last.FinishReason = normalizeFinishReason(reason)
	}
	return messages
}

func finishReasonOf(m map[string]any) string {
	return stringOf(firstOf(m, finishReasonKeys...))
}

func textPart(content string) aiobservabilitytypes.Part {
	return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeText, Content: content}
}

func genericPart(value any) aiobservabilitytypes.Part {
	return aiobservabilitytypes.Part{Type: aiobservabilitytypes.PartTypeGeneric, Content: stringOf(value)}
}

func textMessage(role aiobservabilitytypes.MessageRole, content string) aiobservabilitytypes.Message {
	return aiobservabilitytypes.Message{Role: role, Content: []aiobservabilitytypes.Part{textPart(content)}}
}
