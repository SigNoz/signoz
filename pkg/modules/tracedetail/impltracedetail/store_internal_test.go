package impltracedetail

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildFieldExprQuotesResourceKey(t *testing.T) {
	testCases := []struct {
		name          string
		key           string
		expectedExpr  string
		expectedQuery string
	}{
		{
			name:          "Backtick",
			key:           "svc` OR 1=1 --",
			expectedExpr:  "resource.`svc\\` OR 1=1 --`::String",
			expectedQuery: "SELECT resource.`svc\\` OR 1=1 --`::String AS field_value FROM t WHERE trace_id = ? AND notEmpty(resource.`svc\\` OR 1=1 --`::String)",
		},
		{
			name:          "DollarLetter",
			key:           "a$b",
			expectedExpr:  "resource.`a$$b`::String",
			expectedQuery: "SELECT resource.`a$b`::String AS field_value FROM t WHERE trace_id = ? AND notEmpty(resource.`a$b`::String)",
		},
		{
			name:          "DollarDigit",
			key:           "a$0b",
			expectedExpr:  "resource.`a\\x240b`::String",
			expectedQuery: "SELECT resource.`a\\x240b`::String AS field_value FROM t WHERE trace_id = ? AND notEmpty(resource.`a\\x240b`::String)",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			expr, err := buildFieldExpr(telemetrytypes.TelemetryFieldKey{Name: testCase.key, FieldContext: telemetrytypes.FieldContextResource})
			require.NoError(t, err)
			assert.Equal(t, testCase.expectedExpr, expr)

			sb := sqlbuilder.NewSelectBuilder().Select(expr + " AS field_value").From("t")
			sb.Where(sb.E("trace_id", "x"), "notEmpty("+expr+")")
			query, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Equal(t, testCase.expectedQuery, query)
		})
	}
}
