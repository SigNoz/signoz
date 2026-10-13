package logstelemetryschema

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestBodyJSONPathLiteral(t *testing.T) {
	testCases := []struct {
		name     string
		key      string
		expected string
	}{
		{name: "Nested", key: "user.name", expected: `'$."user"."name"'`},
		{name: "ArrayWildcard", key: "items[*].sku", expected: `'$."items"[*]."sku"'`},
		{name: "DoubleQuote", key: `a"b`, expected: `'$."a\\"b"'`},
		{name: "Backslash", key: `a\b`, expected: `'$."a\\\\b"'`},
		{name: "SingleQuote", key: "a'b", expected: `'$."a\'b"'`},
		{name: "DollarDigit", key: "a$0b", expected: `'$."a\x240b"'`},
		{name: "Injection", key: `x"]) OR 1=1 --`, expected: `'$."x\\"]) OR 1=1 --"'`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			key := &telemetrytypes.TelemetryFieldKey{Name: testCase.key, FieldContext: telemetrytypes.FieldContextBody}
			assert.Equal(t, testCase.expected, bodyJSONPathLiteral(key))
		})
	}
}
