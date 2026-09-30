package telemetrystoretypes

import "github.com/ClickHouse/clickhouse-go/v2/lib/chcol"

// NestedJSON decodes a native JSON column into a nested document. Leaf values are chcol.Variant, which
// serializes itself; a key stored as both a scalar and an object collapses, as the nested form cannot
// hold both.
func NestedJSON(j chcol.JSON) map[string]any {
	return j.NestedMap()
}

// FlattenJSON decodes a native JSON column into its leaf paths as dotted keys, so a key stored as both
// a scalar and an object survives as two distinct keys. Leaf values are chcol.Variant, which
// serializes itself.
func FlattenJSON(j chcol.JSON) map[string]any {
	return j.ValuesByPath()
}
