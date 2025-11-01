package postgressqlstore

import (
	"github.com/stretchr/testify/assert"
	"testing"

	"github.com/uptrace/bun/dialect/pgdialect"
)

func TestFormatter_JSONExtractString(t *testing.T) {
	tests := []struct {
		name     string
		column   string
		path     string
		expected string
	}{
		{
			name:     "simple path",
			column:   "data",
			path:     "$.field",
			expected: `"data"->>'field'`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.user.name",
			expected: `"metadata"->'user'->>'name'`,
		},
		{
			name:     "deeply nested path",
			column:   "json_col",
			path:     "$.level1.level2.level3",
			expected: `"json_col"->'level1'->'level2'->>'level3'`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "$",
			expected: `"json_col"`,
		},
		{
			name:     "empty path",
			column:   "data",
			path:     "",
			expected: `"data"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
			got := string(f.JSONExtractString(tt.column, tt.path))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestFormatter_JSONType(t *testing.T) {
	tests := []struct {
		name     string
		column   string
		path     string
		expected string
	}{
		{
			name:     "simple path",
			column:   "data",
			path:     "$.field",
			expected: `jsonb_typeof("data"->'field')`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.user.age",
			expected: `jsonb_typeof("metadata"->'user'->'age')`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "$",
			expected: `jsonb_typeof("json_col")`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
			got := string(f.JSONType(tt.column, tt.path))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestFormatter_JSONIsArray(t *testing.T) {

	tests := []struct {
		name     string
		column   string
		path     string
		expected string
	}{
		{
			name:     "simple path",
			column:   "data",
			path:     "$.items",
			expected: `jsonb_typeof("data"->'items') = 'array'`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.user.tags",
			expected: `jsonb_typeof("metadata"->'user'->'tags') = 'array'`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "$",
			expected: `jsonb_typeof("json_col") = 'array'`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
			got := string(f.JSONIsArray(tt.column, tt.path))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestFormatter_JSONArrayElements(t *testing.T) {

	tests := []struct {
		name     string
		column   string
		path     string
		alias    string
		expected string
	}{
		{
			name:     "root path with dollar sign",
			column:   "data",
			path:     "$",
			alias:    "elem",
			expected: `jsonb_array_elements("data") AS "elem"`,
		},
		{
			name:     "root path empty",
			column:   "data",
			path:     "",
			alias:    "elem",
			expected: `jsonb_array_elements("data") AS "elem"`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.items",
			alias:    "item",
			expected: `jsonb_array_elements("metadata"->'items') AS "item"`,
		},
		{
			name:     "deeply nested path",
			column:   "json_col",
			path:     "$.user.tags",
			alias:    "tag",
			expected: `jsonb_array_elements("json_col"->'user'->'tags') AS "tag"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
			got, _ := f.JSONArrayElements(tt.column, tt.path, tt.alias)
			assert.Equal(t, tt.expected, string(got))
		})
	}
}

func TestFormatter_JSONArrayAgg(t *testing.T) {

	tests := []struct {
		name       string
		expression string
		expected   string
	}{
		{
			name:       "simple column",
			expression: "id",
			expected:   "jsonb_agg(id)",
		},
		{
			name:       "expression with function",
			expression: "DISTINCT name",
			expected:   "jsonb_agg(DISTINCT name)",
		},
		{
			name:       "complex expression",
			expression: "data->>'field'",
			expected:   "jsonb_agg(data->>'field')",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
			got := string(f.JSONArrayAgg(tt.expression))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestFormatter_JSONArrayLiteral(t *testing.T) {

	tests := []struct {
		name     string
		values   []string
		expected string
	}{
		{
			name:     "empty array",
			values:   []string{},
			expected: "jsonb_build_array()",
		},
		{
			name:     "single value",
			values:   []string{"value1"},
			expected: "jsonb_build_array('value1')",
		},
		{
			name:     "multiple values",
			values:   []string{"value1", "value2", "value3"},
			expected: "jsonb_build_array('value1', 'value2', 'value3')",
		},
		{
			name:     "values with special characters",
			values:   []string{"test", "with space", "with-dash"},
			expected: "jsonb_build_array('test', 'with space', 'with-dash')",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
			got := string(f.JSONArrayLiteral(tt.values...))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestFormatter_convertJSONPathToPostgresWithMode(t *testing.T) {
	tests := []struct {
		name     string
		jsonPath string
		asText   bool
		expected string
	}{
		{
			name:     "simple path as text",
			jsonPath: "$.field",
			asText:   true,
			expected: "->>'field'",
		},
		{
			name:     "simple path as json",
			jsonPath: "$.field",
			asText:   false,
			expected: "->'field'",
		},
		{
			name:     "nested path as text",
			jsonPath: "$.user.name",
			asText:   true,
			expected: "->'user'->>'name'",
		},
		{
			name:     "nested path as json",
			jsonPath: "$.user.name",
			asText:   false,
			expected: "->'user'->'name'",
		},
		{
			name:     "deeply nested as text",
			jsonPath: "$.a.b.c.d",
			asText:   true,
			expected: "->'a'->'b'->'c'->>'d'",
		},
		{
			name:     "root path",
			jsonPath: "$",
			asText:   true,
			expected: "",
		},
		{
			name:     "empty path",
			jsonPath: "",
			asText:   true,
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New()).(*formatter)
			got := f.convertJSONPathToPostgresWithMode(tt.jsonPath, tt.asText)
			assert.Equal(t, tt.expected, got)
		})
	}
}
