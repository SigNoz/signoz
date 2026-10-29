package spantypes

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/stretchr/testify/assert"

	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
)

// scopeColumn mirrors the driver's scan of the scope column: declared String paths as plain strings and the
// declared attributes path as a nested *chcol.JSON.
func scopeColumn(name, version string, attributes map[string]any) telemetrystoretypes.JSONValue {
	j := chcol.NewJSON()
	j.SetValueAtPath("name", name)
	j.SetValueAtPath("version", version)
	attrs := chcol.NewJSON()
	for path, value := range attributes {
		attrs.SetValueAtPath(path, value)
	}
	j.SetValueAtPath("attributes", attrs)
	return telemetrystoretypes.NewJSONValue(*j)
}

func TestNewScope(t *testing.T) {
	testCases := []struct {
		name   string
		column telemetrystoretypes.JSONValue
		want   Scope
	}{
		{
			name:   "AttributesStayDotted",
			column: scopeColumn("io.opentelemetry.http", "1.2.0", map[string]any{"lib.lang": "go", "lib.lang.version": "1.22", "retry": int64(3)}),
			want:   Scope{"name": "io.opentelemetry.http", "version": "1.2.0", "attributes": map[string]any{"lib.lang": "go", "lib.lang.version": "1.22", "retry": float64(3)}},
		},
		{
			name:   "DropsNullAttributePaths_UnsetVersion",
			column: scopeColumn("checkout", "", map[string]any{"team": "payments", "absent": chcol.Variant{}}),
			want:   Scope{"name": "checkout", "attributes": map[string]any{"team": "payments"}},
		},
		{
			name:   "UnsetDeclaredPaths_Empty",
			column: scopeColumn("", "", nil),
			want:   Scope{},
		},
		{
			name:   "EmptyColumn",
			column: telemetrystoretypes.JSONValue{},
			want:   Scope{},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, NewScope(testCase.column.Flatten()))
		})
	}
}
