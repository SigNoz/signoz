package genaimessages

import (
	"encoding/json"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
)

// parseArguments decodes JSON-encoded arguments; anything else is returned as is.
func parseArguments(value any) any {
	s, ok := value.(string)
	if !ok {
		return value
	}
	var decoded any
	if err := json.Unmarshal([]byte(s), &decoded); err != nil {
		return s
	}
	return decoded
}

func decodeJSONStrings(list []any) ([]any, bool) {
	out := make([]any, 0, len(list))
	for _, item := range list {
		s, ok := item.(string)
		if !ok {
			return nil, false
		}
		var decoded map[string]any
		if err := json.Unmarshal([]byte(s), &decoded); err != nil || decoded == nil {
			return nil, false
		}
		out = append(out, decoded)
	}
	return out, true
}

func flattenOnce(list []any) []any {
	out := make([]any, 0, len(list))
	for _, item := range list {
		if inner, ok := item.([]any); ok {
			out = append(out, inner...)
			continue
		}
		out = append(out, item)
	}
	return out
}

// object is a decoded JSON object. Its accessors return zero values for missing
// keys and for values of another type, so reads never panic.
type object map[string]any

func toObject(value any) (object, bool) {
	switch v := value.(type) {
	case object:
		return v, true
	case map[string]any:
		return v, true
	}
	return nil, false
}

func asObject(value any) object {
	m, _ := toObject(value)
	return m
}

func (o object) at(key string) any {
	return o[key]
}

func (o object) get(key string) (any, bool) {
	value, ok := o[key]
	return value, ok
}

func (o object) has(key string) bool {
	_, ok := o[key]
	return ok
}

func (o object) str(key string) string {
	return stringOf(o[key])
}

func (o object) flag(key string) bool {
	return boolOf(o[key])
}

func (o object) text(key string) (string, bool) {
	s, ok := o[key].(string)
	return s, ok
}

func (o object) obj(key string) (object, bool) {
	return toObject(o[key])
}

func (o object) list(key string) ([]any, bool) {
	l, ok := o[key].([]any)
	return l, ok
}

// lookup returns the first non-nil value among keys.
func (o object) lookup(keys ...string) (any, bool) {
	for _, k := range keys {
		if value, ok := o[k]; ok && value != nil {
			return value, true
		}
	}
	return nil, false
}

func (o object) first(keys ...string) any {
	value, _ := o.lookup(keys...)
	return value
}

func firstItem(list []any) any {
	if len(list) == 0 {
		return nil
	}
	return list[0]
}

// lastMessage returns nil for an empty slice.
func lastMessage(messages []aiobservabilitytypes.Message) *aiobservabilitytypes.Message {
	if len(messages) == 0 {
		return nil
	}
	return &messages[len(messages)-1]
}

func lastItem(list []any) any {
	if len(list) == 0 {
		return nil
	}
	return list[len(list)-1]
}

func boolOf(value any) bool {
	b, _ := value.(bool)
	return b
}

// stringOf renders nil as "" and non-strings as compact JSON.
func stringOf(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return v
	}
	data, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(data)
}
