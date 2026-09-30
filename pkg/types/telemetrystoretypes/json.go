package telemetrystoretypes

import (
	"encoding/json"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/bytedance/sonic"
)

// NestedJSON decodes a native JSON column into a nested document. Leaf values are chcol.Variant, which
// serializes itself; a key stored as both a scalar and an object collapses, as the nested form cannot
// hold both.
func NestedJSON(j chcol.JSON) map[string]any {
	return j.NestedMap()
}

// FlattenJSON decodes a native JSON column into its leaf paths as dotted keys, so a key stored as
// both a scalar and an object survives as two distinct keys — unlike the nested form, which cannot
// hold both. Dynamic values arrive unwrapped, arrays of objects intact.
func FlattenJSON(j chcol.JSON) map[string]any {
	paths := j.ValuesByPath()
	out := make(map[string]any, len(paths))
	for path, value := range paths {
		out[path] = decodePathValue(value)
	}
	return out
}

func decodePathValue(value any) any {
	variant, ok := value.(chcol.Variant)
	if !ok {
		return value
	}
	raw, err := json.Marshal(variant)
	if err != nil {
		return nil
	}
	var out any
	if err := sonic.Unmarshal(raw, &out); err != nil {
		return nil
	}
	return out
}
