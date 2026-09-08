package telemetrystoretypes

// FlattenJSONPaths flattens a decoded JSON document into dotted keys (a nested {"http":{"route":x}}
// becomes "http.route": x), matching the legacy map representation so the attributes bag has the
// same flat shape whether it was read from the maps or the JSON column. Existing keys are
// overwritten, so a JSON path wins over a same-named map entry.
func FlattenJSONPaths(prefix string, m map[string]any, out map[string]any) {
	for k, v := range m {
		key := k
		if prefix != "" {
			key = prefix + "." + k
		}
		switch child := v.(type) {
		case map[string]any:
			FlattenJSONPaths(key, child, out)
		case JSONValue:
			FlattenJSONPaths(key, child, out)
		default:
			out[key] = v
		}
	}
}
