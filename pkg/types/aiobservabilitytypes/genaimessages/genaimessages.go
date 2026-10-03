package genaimessages

import (
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// Ordered by specificity: earlier converters never match a later format.
var converters = []converter{
	convertSemconvMessages,
	convertChatMessageList,
	convertToolCallList,
	convertChatRequest,
	convertChatResponse,
	convertResponsesAPIResponse,
	convertGeminiResponse,
	convertLegacyCompletion,
	convertLangChainGenerations,
}

// Normalize converts a gen_ai.*.messages value, a JSON string or a decoded value.
// A string that is not JSON becomes one text part; JSON in no known format becomes
// one generic part holding the original.
func Normalize(raw any) []aiobservabilitytypes.Message {
	var (
		value    any
		original string
	)
	switch v := raw.(type) {
	case nil:
		return []aiobservabilitytypes.Message{}
	case string:
		if strings.TrimSpace(v) == "" {
			return []aiobservabilitytypes.Message{}
		}
		original = v
		if err := json.Unmarshal([]byte(v), &value); err != nil {
			return []aiobservabilitytypes.Message{{Content: []aiobservabilitytypes.Part{textPart(v)}}}
		}
	default:
		value = v
		original = stringOf(v)
	}
	if value == nil {
		return []aiobservabilitytypes.Message{}
	}

	if list, ok := value.([]any); ok {
		if len(list) == 0 {
			return []aiobservabilitytypes.Message{}
		}
		// [[...]]: some SDKs wrap the conversation in one more list
		if _, nested := firstItem(list).([]any); nested {
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
