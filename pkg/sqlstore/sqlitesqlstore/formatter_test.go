package sqlitesqlstore

import (
	"github.com/stretchr/testify/assert"
	"testing"

	"github.com/uptrace/bun/dialect/sqlitedialect"
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.JSONType(tt.column, tt.path))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestFormatter_JSONIsArray(t *testing.T) {

	tests := []struct {
		name   string
		column string
		path   string
		want   string
	}{
		{
			name:   "simple path",
			column: "data",
			path:   "$.items",
			want:   `json_type("data", '$.items') = 'array'`,
		},
		{
			name:   "nested path",
			column: "metadata",
			path:   "$.user.tags",
			want:   `json_type("metadata", '$.user.tags') = 'array'`,
		},
		{
			name:   "root path",
			column: "json_col",
			path:   "$",
			want:   `json_type("json_col", '$') = 'array'`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.JSONIsArray(tt.column, tt.path))
			assert.Equal(t, tt.want, got)
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
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

func TestFormatter_JSONArrayLiteral(t *testing.T) {

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
