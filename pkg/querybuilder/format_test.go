package querybuilder

import (
	"encoding/json"
	"fmt"
	"math"
	"testing"

	"github.com/stretchr/testify/assert"
)

type customStringer struct {
	value string
}

func (c customStringer) String() string {
	return c.value
}

type customInt int64
type customFloat float64
type customUint uint64

func TestFormatValueForContains(t *testing.T) {
	tests := []struct {
		name     string
		input    any
		expected string
	}{
		{
			name:     "nil value",
			input:    nil,
			expected: "",
		},
		{
			name:     "string value",
			input:    "hello world",
			expected: "hello world",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "string with special characters",
			input:    "test@#$%^&*()_+-=",
			expected: "test@#$%^&*()_+-=",
		},
		{
			name:     "byte slice",
			input:    []byte("byte slice test"),
			expected: "byte slice test",
		},
		{
			name:     "empty byte slice",
			input:    []byte{},
			expected: "",
		},
		{
			name:     "json.Number integer",
			input:    json.Number("521509198310"),
			expected: "521509198310",
		},
		{
			name:     "json.Number float",
			input:    json.Number("3.14159"),
			expected: "3.14159",
		},
		{
			name:     "json.Number scientific notation",
			input:    json.Number("1.23e+10"),
			expected: "1.23e+10",
		},
		{
			name:     "float64 whole number",
			input:    float64(42),
			expected: "42",
		},
		{
			name:     "float64 decimal",
			input:    float64(3.14159),
			expected: "3.14159",
		},
		{
			name:     "float64 large whole number",
			input:    float64(521509198310),
			expected: "521509198310",
		},
		{
			name:     "float64 at positive threshold",
			input:    float64(1e15),
			expected: "1000000000000000",
		},
		{
			name:     "float64 above positive threshold",
			input:    float64(1e16),
			expected: "10000000000000000",
		},
		{
			name:     "float64 at negative threshold",
			input:    float64(-1e15),
			expected: "-1000000000000000",
		},
		{
			name:     "float64 negative decimal",
			input:    float64(-123.456),
			expected: "-123.456",
		},
		{
			name:     "float64 zero",
			input:    float64(0),
			expected: "0",
		},
		{
			name:     "float32 whole number",
			input:    float32(42),
			expected: "42",
		},
		{
			name:     "float32 decimal",
			input:    float32(3.14),
			expected: "3.14",
		},
		{
			name:     "int",
			input:    int(123),
			expected: "123",
		},
		{
			name:     "int negative",
			input:    int(-456),
			expected: "-456",
		},
		{
			name:     "int8 max",
			input:    int8(127),
			expected: "127",
		},
		{
			name:     "int8 min",
			input:    int8(-128),
			expected: "-128",
		},
		{
			name:     "int16",
			input:    int16(32767),
			expected: "32767",
		},
		{
			name:     "int32",
			input:    int32(2147483647),
			expected: "2147483647",
		},
		{
			name:     "int64",
			input:    int64(9223372036854775807),
			expected: "9223372036854775807",
		},
		{
			name:     "uint",
			input:    uint(123),
			expected: "123",
		},
		{
			name:     "uint8 max",
			input:    uint8(255),
			expected: "255",
		},
		{
			name:     "uint16",
			input:    uint16(65535),
			expected: "65535",
		},
		{
			name:     "uint32",
			input:    uint32(4294967295),
			expected: "4294967295",
		},
		{
			name:     "uint64 large",
			input:    uint64(18446744073709551615),
			expected: "18446744073709551615",
		},
		{
			name:     "bool true",
			input:    true,
			expected: "true",
		},
		{
			name:     "bool false",
			input:    false,
			expected: "false",
		},
		{
			name:     "custom stringer",
			input:    customStringer{value: "custom string value"},
			expected: "custom string value",
		},
		{
			name:     "custom int type",
			input:    customInt(12345),
			expected: "12345",
		},
		{
			name:     "custom float type whole number",
			input:    customFloat(67890),
			expected: "67890",
		},
		{
			name:     "custom float type decimal",
			input:    customFloat(123.456),
			expected: "123.456",
		},
		{
			name:     "custom uint type",
			input:    customUint(99999),
			expected: "99999",
		},
		{
			name:     "struct fallback",
			input:    struct{ Name string }{Name: "test"},
			expected: "{test}",
		},
		{
			name:     "slice fallback",
			input:    []int{1, 2, 3},
			expected: "[1 2 3]",
		},
		{
			name:     "map fallback",
			input:    map[string]int{"a": 1, "b": 2},
			expected: fmt.Sprintf("%v", map[string]int{"a": 1, "b": 2}),
		},
		{
			name:     "float64 infinity",
			input:    math.Inf(1),
			expected: "+Inf",
		},
		{
			name:     "float64 negative infinity",
			input:    math.Inf(-1),
			expected: "-Inf",
		},
		{
			name:     "float64 NaN",
			input:    math.NaN(),
			expected: "NaN",
		},
		{
			name:     "float64 very small positive",
			input:    float64(0.000000123),
			expected: "0.000000123",
		},
		{
			name:     "float64 very small negative",
			input:    float64(-0.000000123),
			expected: "-0.000000123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FormatValueForContains(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestFormatValueForContains_LargeNumberScientificNotation(t *testing.T) {
	largeNumber := float64(521509198310)
	result := FormatValueForContains(largeNumber)
	assert.Equal(t, "521509198310", result)
	assert.NotEqual(t, "5.2150919831e+11", result)
}

func TestFormatFullTextSearch(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		// valid regex, unchanged
		{"foo.*bar", "foo.*bar"},
		// invalid regex, escaped
		{"[ERROR-1234]", `\[ERROR-1234\]`},
		// literal with +
		{"C++ Error", `C\+\+ Error`},
		// IP address, valid regex but unsafe chars
		{"10.0.0.1", "10.0.0.1"},
		// java class, '.' will still be regex wildcard
		{"java.lang.NullPointerException", "java.lang.NullPointerException"},
		// a-o  invalid character class range
		{"[LocalLog partition=__cluster_metadata-0,", "\\[LocalLog partition=__cluster_metadata-0,"},
		{"[abcd]", "[abcd]"},
	}
	for _, tt := range tests {
		got := FormatFullTextSearch(tt.input)
		if got != tt.expected {
			t.Errorf("FormatFullTextSearch(%q) = %q, want %q", tt.input, got, tt.expected)
		}
	}
}
