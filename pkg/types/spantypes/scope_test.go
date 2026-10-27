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
			want:   Scope{Name: "io.opentelemetry.http", Version: "1.2.0", Attributes: map[string]any{"lib.lang": "go", "lib.lang.version": "1.22", "retry": float64(3)}},
		},
		{
			name:   "DropsNullAttributePaths",
			column: scopeColumn("checkout", "", map[string]any{"team": "payments", "absent": chcol.Variant{}}),
			want:   Scope{Name: "checkout", Attributes: map[string]any{"team": "payments"}},
		},
		{
			name:   "EmptyColumn",
			column: telemetrystoretypes.JSONValue{},
			want:   Scope{Attributes: map[string]any{}},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, NewScope(testCase.column))
		})
	}
}
