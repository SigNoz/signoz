package telemetrystoretypes

import "github.com/ClickHouse/clickhouse-go/v2/lib/chcol"

// JSONValue is the decoded form of a ClickHouse JSON column: a nested document whose leaf values
// are unwrapped from the driver's chcol.Variant envelope.
type JSONValue map[string]any

// NestedJSON decodes a native JSON column into a nested document. Dotted leaf paths become nested
// maps; a key stored as both a scalar and an object collapses, as the nested form cannot hold both.
func NestedJSON(j chcol.JSON) JSONValue {
	return unwrapNested(j.NestedMap())
}

func unwrapNested(m map[string]any) JSONValue {
	out := make(JSONValue, len(m))
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
