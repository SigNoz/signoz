package telemetrystoretypes

import "github.com/ClickHouse/clickhouse-go/v2/lib/chcol"

// NestedJSON decodes a native JSON column into a nested document, unwrapping the driver's
// chcol.Variant envelope. A key stored as both a scalar and an object collapses, as the nested
// form cannot hold both.
func NestedJSON(j chcol.JSON) map[string]any {
	return unwrapNested(j.NestedMap())
}

func unwrapNested(m map[string]any) map[string]any {
	out := make(map[string]any, len(m))
	for key, value := range m {
		out[key] = unwrapValue(value)
	}
	return out
}

func unwrapValue(value any) any {
	switch v := value.(type) {
	case chcol.Variant:
		return unwrapValue(v.Any())
	case map[string]any:
		return unwrapNested(v)
	case []any:
		for i := range v {
			v[i] = unwrapValue(v[i])
		}
		return v
	default:
		return value
	}
}
