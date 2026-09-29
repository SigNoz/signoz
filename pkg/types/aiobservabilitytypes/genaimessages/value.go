package genaimessages

import "encoding/json"

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

func lookup(m map[string]any, keys ...string) (any, bool) {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			return v, true
		}
	}
	return nil, false
}

func firstOf(m map[string]any, keys ...string) any {
	v, _ := lookup(m, keys...)
	return v
}

func asMap(value any) map[string]any {
	m, _ := value.(map[string]any)
	return m
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
