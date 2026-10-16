package telemetrystoretypes

import (
	"encoding/json"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
)

// FlattenJSON returns a JSON column as a flat map of dotted paths to plain values. It drops the null
// paths ClickHouse materializes for a row from its data part's shared path schema, and keeps a value
// stored at both a scalar and an object path (db.function and db.function.arg), which a nested map
// collapses.
func FlattenJSON(column chcol.JSON) map[string]any {
	values := column.ValuesByPath()
	flat := make(map[string]any, len(values))
	for path, value := range values {
		if isNull(value) {
			continue
		}
		flat[path] = value
	}
	return plain(flat)
}

// NestJSON returns a JSON column as a nested document of plain values, as the message formatter reads
// it. NestedMap drops the null paths; the plain conversion resolves the driver's Variant wrappers so
// the formatter's type switches see []any and map[string]any.
func NestJSON(column chcol.JSON) map[string]any {
	return plain(column.NestedMap())
}

func isNull(value any) bool {
	if value == nil {
		return true
	}
	variant, ok := value.(chcol.Variant)
	return ok && variant.Nil()
}

// plain rewrites the driver's Variant wrappers to the Go types the callers assert on, through a JSON
// round-trip; a document that does not round-trip is returned unchanged.
func plain(doc map[string]any) map[string]any {
	raw, err := json.Marshal(doc)
	if err != nil {
		return doc
	}
	out := make(map[string]any, len(doc))
	if err := json.Unmarshal(raw, &out); err != nil {
		return doc
	}
	return out
}
