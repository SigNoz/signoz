package telemetrystoretypes

import (
	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/bytedance/sonic"
)

// NestedJSON decodes a native JSON column into a nested document via the driver's own marshaler, so
// arrays of objects and typed sub-paths survive and Dynamic values arrive unwrapped. A key stored as
// both a scalar and an object collapses, as the nested form cannot hold both.
func NestedJSON(j chcol.JSON) map[string]any {
	raw, err := j.MarshalJSON()
	if err != nil {
		return nil
	}
	var out map[string]any
	if err := sonic.Unmarshal(raw, &out); err != nil {
		return nil
	}
	return out
}
