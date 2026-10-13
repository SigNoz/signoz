package telemetrystoretypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/bytedance/sonic"
)

var ErrCodeUnmarshalJSONColumn = errors.MustNewCode("fail_unmarshal_json_column")

// JSONValue is the scan target for a ClickHouse JSON column: the connection sets
// output_format_native_write_json_as_string, so the column arrives as a raw document rather than
// the chcol.JSON the driver reports as its scan type.
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
