package telemetrystoretypes

import "github.com/ClickHouse/clickhouse-go/v2/lib/chcol"

// FlattenJSON reads a native JSON column by its flattened leaf paths, so a key stored as both a scalar and an object survives as distinct dotted keys; unwraps the Dynamic envelope each value arrives in.
func FlattenJSON(j chcol.JSON) map[string]any {
	paths := j.ValuesByPath()
	out := make(map[string]any, len(paths))
	for path, value := range paths {
		if dynamic, ok := value.(chcol.Variant); ok {
			out[path] = dynamic.Any()
		} else {
			out[path] = value
		}
	}
	return out
}
