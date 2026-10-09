package genai

import (
	"encoding/json"
	"reflect"
	"slices"
	"strings"
	"sync"
)

var jsonKeysCache sync.Map // reflect.Type -> []string

// marshalWithExtras appends the extra keys after the struct's own fields, which keep their
// declaration order. A struct field shadows an extra of the same name.
func marshalWithExtras(known any, extras map[string]any) ([]byte, error) {
	data, err := json.Marshal(known)
	if err != nil {
		return nil, err
	}
	filtered := make(map[string]any, len(extras))
	keys := jsonKeys(reflect.TypeOf(known))
	for key, value := range extras {
		if !slices.Contains(keys, key) {
			filtered[key] = value
		}
	}
	if len(filtered) == 0 {
		return data, nil
	}
	extra, err := json.Marshal(filtered)
	if err != nil {
		return nil, err
	}
	if len(data) <= 2 {
		return extra, nil
	}
	return append(append(data[:len(data)-1], ','), extra[1:]...), nil
}

// unmarshalWithExtras decodes the struct's own fields into known, a pointer to a struct, and
// returns the remaining keys. The map is nil when there are none.
func unmarshalWithExtras(data []byte, known any) (map[string]any, error) {
	if err := json.Unmarshal(data, known); err != nil {
		return nil, err
	}
	var all map[string]any
	if err := json.Unmarshal(data, &all); err != nil {
		return nil, err
	}
	for _, key := range jsonKeys(reflect.TypeOf(known).Elem()) {
		delete(all, key)
	}
	if len(all) == 0 {
		return nil, nil
	}
	return all, nil
}

// jsonKeys lists the json names of the struct's fields.
func jsonKeys(t reflect.Type) []string {
	if cached, ok := jsonKeysCache.Load(t); ok {
		return cached.([]string)
	}
	keys := make([]string, 0, t.NumField())
	for i := range t.NumField() {
		name, _, _ := strings.Cut(t.Field(i).Tag.Get("json"), ",")
		if name == "" || name == "-" {
			continue
		}
		keys = append(keys, name)
	}
	jsonKeysCache.Store(t, keys)
	return keys
}
