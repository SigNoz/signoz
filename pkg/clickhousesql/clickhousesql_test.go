package clickhousesql

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStringLiteral(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{name: "Plain", input: "service.name", expected: `'service.name'`},
		{name: "SingleQuote", input: "a'b", expected: `'a\'b'`},
		{name: "TrailingBackslash", input: `a\`, expected: `'a\\'`},
		{name: "Backtick", input: "a`b", expected: "'a`b'"},
		{name: "DollarDigit", input: "a$0b", expected: `'a\x240b'`},
		{name: "Empty", input: "", expected: `''`},
		{name: "Injection", input: "x' OR '1'='1", expected: `'x\' OR \'1\'=\'1'`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, StringLiteral(testCase.input))
		})
	}
}

func TestIdentifier(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{name: "Plain", input: "http.status_code", expected: "`http.status_code`"},
		{name: "Backtick", input: "a`b", expected: "`a\\`b`"},
		{name: "TrailingBackslash", input: `a\`, expected: "`a\\\\`"},
		{name: "SingleQuote", input: "k'v", expected: "`k'v`"},
		{name: "DollarBrace", input: "${x}", expected: "`\\x24{x}`"},
		{name: "DollarQuestion", input: "$?", expected: "`\\x24?`"},
		{name: "DollarLetter", input: "$ref", expected: "`$ref`"},
		{name: "TrailingDollar", input: "a$", expected: "`a$`"},
		{name: "MaterializedColumn", input: "resource_string_service$$name", expected: "`resource_string_service$$name`"},
		{name: "MaterializedColumn_DollarDigit", input: "attribute_string_http$$2xx", expected: "`attribute_string_http$\\x242xx`"},
		{name: "Empty", input: "", expected: "``"},
		{name: "Injection", input: "x` OR 1=1 --", expected: "`x\\` OR 1=1 --`"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, Identifier(testCase.input))
		})
	}
}

func TestLikePattern(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{name: "Plain", input: "k8s.pod.name", expected: `k8s.pod.name`},
		{name: "Percent", input: "100%", expected: `100\%`},
		{name: "Underscore", input: "a_b", expected: `a\_b`},
		{name: "Backslash", input: `a\b`, expected: `a\\b`},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, LikePattern(testCase.input))
		})
	}
}

func TestLiteral(t *testing.T) {
	n := 42
	testCases := []struct {
		name     string
		input    any
		expected string
	}{
		{name: "Int", input: 42, expected: "42"},
		{name: "IntPointer", input: &n, expected: "42"},
		{name: "Float", input: 1.5, expected: "1.500000"},
		{name: "Bool", input: true, expected: "true"},
		{name: "String", input: "a'b", expected: `'a\'b'`},
		{name: "StringSlice", input: []string{"a", "b'c"}, expected: `['a','b\'c']`},
		{name: "AnySlice_Strings", input: []any{"a", "b"}, expected: `['a','b']`},
		{name: "AnySlice_Ints", input: []any{1, 2, 3}, expected: "[1,2,3]"},
		{name: "AnySlice_Empty", input: []any{}, expected: "[]"},
		{name: "Nil", input: nil, expected: ""},
		{name: "NilPointer", input: (*string)(nil), expected: ""},
		{name: "Unsupported", input: struct{}{}, expected: ""},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expected, Literal(testCase.input))
		})
	}
}
