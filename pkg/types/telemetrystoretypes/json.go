package telemetrystoretypes

import "github.com/ClickHouse/clickhouse-go/v2/lib/chcol"

// JSONValue is a ClickHouse JSON column read as its flattened leaf paths, so a key stored as both a scalar and an object survives as distinct dotted keys.
type JSONValue map[string]any

// FlattenJSON reads a native JSON document by its flattened paths, unwrapping the Dynamic envelope each leaf value arrives in.
func FlattenJSON(j chcol.JSON) JSONValue {
	paths := j.ValuesByPath()
	out := make(JSONValue, len(paths))
	for path, value := range paths {
		if dynamic, ok := value.(chcol.Variant); ok {
			out[path] = dynamic.Any()
		} else {
			out[path] = value
		}
	}
	return out
}
