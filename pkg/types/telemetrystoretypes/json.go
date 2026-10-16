package telemetrystoretypes

import (
	"encoding/json"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/bytedance/sonic"
)

var ErrCodeUnmarshalJSONColumn = errors.MustNewCode("fail_unmarshal_json_column")

// JSONValue is the scan target for a ClickHouse JSON column read as a string.
type JSONValue map[string]any

// Scan decodes into a fresh map every time: a scan target is reused across rows, and unmarshalling
// into the map already there would both keep its keys and hand every row the same map.
func (v *JSONValue) Scan(src any) error {
	var raw []byte
	switch value := src.(type) {
	case nil:
		*v = nil
		return nil
	case string:
		raw = []byte(value)
	case []byte:
		raw = value
	default:
		return errors.NewInternalf(ErrCodeUnmarshalJSONColumn, "cannot decode %T as a JSON column", src)
	}

	decoded := JSONValue{}
	if err := sonic.Unmarshal(raw, &decoded); err != nil {
		return errors.WrapInternalf(err, ErrCodeUnmarshalJSONColumn, "failed to unmarshal JSON column")
	}
	*v = decoded
	return nil
}

// FlattenInto writes v into out under dotted keys, overwriting existing keys.
func (v JSONValue) FlattenInto(prefix string, out map[string]any) {
	for k, value := range v {
		key := k
		if prefix != "" {
			key = prefix + "." + k
		}
		switch child := value.(type) {
		case map[string]any:
			JSONValue(child).FlattenInto(key, out)
		case JSONValue:
			child.FlattenInto(key, out)
		default:
			out[key] = value
		}
	}
}

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
