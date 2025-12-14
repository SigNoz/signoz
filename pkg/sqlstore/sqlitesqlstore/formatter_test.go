package sqlitesqlstore

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func TestJSONExtractString(t *testing.T) {
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
			expected: `json_extract("data", '$.field')`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.user.name",
			expected: `json_extract("metadata", '$.user.name')`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "$",
			expected: `json_extract("json_col", '$')`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "",
			expected: `json_extract("json_col", '')`,
		},
		{
			name:     "array index path",
			column:   "items",
			path:     "$.list[0]",
			expected: `json_extract("items", '$.list[0]')`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.JSONExtractString(tt.column, tt.path))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestJSONType(t *testing.T) {
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
			expected: `json_type("data", '$.field')`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.user.age",
			expected: `json_type("metadata", '$.user.age')`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "$",
			expected: `json_type("json_col", '$')`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "",
			expected: `json_type("json_col", '')`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.JSONType(tt.column, tt.path))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestJSONIsArray(t *testing.T) {
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
			expected: `json_type("data", '$.items') = 'array'`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.user.tags",
			expected: `json_type("metadata", '$.user.tags') = 'array'`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "$",
			expected: `json_type("json_col", '$') = 'array'`,
		},
		{
			name:     "root path",
			column:   "json_col",
			path:     "",
			expected: `json_type("json_col", '') = 'array'`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.JSONIsArray(tt.column, tt.path))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestJSONArrayElements(t *testing.T) {
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
			expected: `json_each("data") AS "elem"`,
		},
		{
			name:     "root path empty",
			column:   "data",
			path:     "",
			alias:    "elem",
			expected: `json_each("data") AS "elem"`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.items",
			alias:    "item",
			expected: `json_each("metadata", '$.items') AS "item"`,
		},
		{
			name:     "deeply nested path",
			column:   "json_col",
			path:     "$.user.tags",
			alias:    "tag",
			expected: `json_each("json_col", '$.user.tags') AS "tag"`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "",
			alias:    "item",
			expected: `json_each("metadata") AS "item"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got, _ := f.JSONArrayElements(tt.column, tt.path, tt.alias)
			assert.Equal(t, tt.expected, string(got))
		})
	}
}

func TestJSONArrayOfStrings(t *testing.T) {
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
			alias:    "str",
			expected: `json_each("data") AS "str"`,
		},
		{
			name:     "root path empty",
			column:   "data",
			path:     "",
			alias:    "str",
			expected: `json_each("data") AS "str"`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.strings",
			alias:    "s",
			expected: `json_each("metadata", '$.strings') AS "s"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got, _ := f.JSONArrayOfStrings(tt.column, tt.path, tt.alias)
			assert.Equal(t, tt.expected, string(got))
		})
	}
}

func TestJSONKeys(t *testing.T) {
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
			alias:    "k",
			expected: `json_each("data") AS "k"`,
		},
		{
			name:     "root path empty",
			column:   "data",
			path:     "",
			alias:    "k",
			expected: `json_each("data") AS "k"`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.object",
			alias:    "key",
			expected: `json_each("metadata", '$.object') AS "key"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got, _ := f.JSONKeys(tt.column, tt.path, tt.alias)
			assert.Equal(t, tt.expected, string(got))
		})
	}
}

func TestJSONArrayAgg(t *testing.T) {
	tests := []struct {
		name       string
		expression string
		expected   string
	}{
		{
			name:       "simple column",
			expression: "id",
			expected:   "json_group_array(id)",
		},
		{
			name:       "expression with function",
			expression: "DISTINCT name",
			expected:   "json_group_array(DISTINCT name)",
		},
		{
			name:       "complex expression",
			expression: "json_extract(data, '$.field')",
			expected:   "json_group_array(json_extract(data, '$.field'))",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.JSONArrayAgg(tt.expression))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestJSONArrayLiteral(t *testing.T) {
	tests := []struct {
		name     string
		values   []string
		expected string
	}{
		{
			name:     "empty array",
			values:   []string{},
			expected: "json_array()",
		},
		{
			name:     "single value",
			values:   []string{"value1"},
			expected: "json_array('value1')",
		},
		{
			name:     "multiple values",
			values:   []string{"value1", "value2", "value3"},
			expected: "json_array('value1', 'value2', 'value3')",
		},
		{
			name:     "values with special characters",
			values:   []string{"test", "with space", "with-dash"},
			expected: "json_array('test', 'with space', 'with-dash')",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.JSONArrayLiteral(tt.values...))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestTextToJsonColumn(t *testing.T) {
	tests := []struct {
		name     string
		column   string
		expected string
	}{
		{
			name:     "simple column name",
			column:   "data",
			expected: `"data"`,
		},
		{
			name:     "column with underscore",
			column:   "user_data",
			expected: `"user_data"`,
		},
		{
			name:     "column with special characters",
			column:   "json-col",
			expected: `"json-col"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.TextToJsonColumn(tt.column))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestLowerExpression(t *testing.T) {
	tests := []struct {
		name     string
		expr     string
		expected string
	}{
		{
			name:     "json_extract expression",
			expr:     "json_extract(data, '$.field')",
			expected: "lower(json_extract(data, '$.field'))",
		},
		{
			name:     "nested json_extract",
			expr:     "json_extract(metadata, '$.user.name')",
			expected: "lower(json_extract(metadata, '$.user.name'))",
		},
		{
			name:     "json_type expression",
			expr:     "json_type(data, '$.field')",
			expected: "lower(json_type(data, '$.field'))",
		},
		{
			name:     "string concatenation",
			expr:     "first_name || ' ' || last_name",
			expected: "lower(first_name || ' ' || last_name)",
		},
		{
			name:     "CAST expression",
			expr:     "CAST(value AS TEXT)",
			expected: "lower(CAST(value AS TEXT))",
		},
		{
			name:     "COALESCE expression",
			expr:     "COALESCE(name, 'default')",
			expected: "lower(COALESCE(name, 'default'))",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.LowerExpression(tt.expr))
			assert.Equal(t, tt.expected, got)
		})
	}
}
