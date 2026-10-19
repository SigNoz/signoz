package telemetrystoretypes

import (
	"encoding/json"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
)

var (
	_ chcol.JSONDeserializer = (*JSONValue)(nil)
	_ json.Marshaler         = JSONValue{}
)

// JSONValue is the scan target for a ClickHouse native JSON column. It holds the column as the driver's
// chcol.JSON, so a key stored at both a scalar and an object path (db.function and db.function.arg) stays
// two paths that nesting would collapse into one. Read it with Flatten for the flat attribute bag or Nest
// for a nested document; both drop the null paths ClickHouse materializes for a row from its data part's
// shared path schema.
type JSONValue struct {
	column chcol.JSON
}

// NewJSONValue wraps a chcol.JSON a caller holds outside the native scan path.
func NewJSONValue(column chcol.JSON) JSONValue {
	return JSONValue{column: column}
}

// DeserializeClickHouseJSON lets the native driver scan a JSON column straight into the wrapper.
func (v *JSONValue) DeserializeClickHouseJSON(column *chcol.JSON) error {
	v.column = *column
	return nil
}

// Flatten returns the column as a flat map of dotted path to value, the shape of an attribute bag.
// A path whose value is null is skipped.
func (v JSONValue) Flatten() map[string]any {
	flat := make(map[string]any)
	for path, value := range v.column.ValuesByPath() {
		if isNull(value) {
			continue
		}
		flat[path] = value
	}
	return unwrap(flat)
}

// Nest returns the column as a nested document, the shape the logs body is returned to the client in.
// A key stored at both a scalar and an object path collapses here, which Flatten avoids:
// https://github.com/SigNoz/events-pod/issues/8
func (v JSONValue) Nest() map[string]any {
	return unwrap(v.column.NestedMap())
}

// MarshalJSON renders the flat attribute bag, so a reader that stores the scan target without calling
// Flatten or Nest serializes the column instead of the empty struct.
func (v JSONValue) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.Flatten())
}

func isNull(value any) bool {
	if value == nil {
		return true
	}
	variant, ok := value.(chcol.Variant)
	return ok && variant.Nil()
}

// unwrap resolves the driver's Dynamic and Variant wrappers to plain Go types through a JSON round-trip,
// so callers can type-assert the values. A document that does not round-trip is returned unchanged.
func unwrap(doc map[string]any) map[string]any {
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
