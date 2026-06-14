package dashboardtypes

import "encoding/json"

// ══════════════════════════════════════════════
// Generic helpers
// ══════════════════════════════════════════════

// ptrValueAt is the pointer-returning sibling of valueAt: it returns *T so the
// caller can tell "absent / wrong type" (nil) apart from a present zero value.
// Used for optional fields like soft axis bounds and histogram bucket sizing.
func ptrValueAt[T any](raw any, key string) *T {
	m, ok := raw.(map[string]any)
	if !ok {
		return nil
	}
	v, ok := m[key].(T)
	if !ok {
		return nil
	}
	return &v
}

func readStringMap(raw any) map[string]string {
	m, ok := raw.(map[string]any)
	if !ok || len(m) == 0 {
		return nil
	}
	out := make(map[string]string, len(m))
	for k, v := range m {
		if s, ok := v.(string); ok {
			out[k] = s
		}
	}
	return out
}

func readSliceOfMaps(raw any) []map[string]any {
	rawSlice, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(rawSlice))
	for _, item := range rawSlice {
		if m, ok := item.(map[string]any); ok {
			out = append(out, m)
		}
	}
	return out
}

// valueAt reads key from raw (when raw is a map[string]any) and returns its
// value as T, or the zero value of T if raw isn't a map, the key is absent, or
// the stored value isn't a T. Used to pull typed fields out of the untyped v1
// dashboard blob.
func valueAt[T any](raw any, key string) T {
	var zero T
	m, ok := raw.(map[string]any)
	if !ok {
		return zero
	}
	v, _ := m[key].(T)
	return v
}

// intAt is a thin wrapper over valueAt: JSON decodes numbers as float64, so an
// integer field must be read as float64 and narrowed.
func intAt(raw any, key string) int {
	return int(valueAt[float64](raw, key))
}

// decodeMapInto converts an untyped map[string]any into a typed T by
// round-tripping through JSON, letting encoding/json (struct tags, custom
// UnmarshalJSON) do the field mapping instead of hand-copying out of the map.
func decodeMapInto[T any](src map[string]any) (T, error) {
	var dst T
	bytes, err := json.Marshal(src)
	if err != nil {
		return dst, err
	}
	if err := json.Unmarshal(bytes, &dst); err != nil {
		return dst, err
	}
	return dst, nil
}
