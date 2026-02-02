package postgressqlstore

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/dialect/pgdialect"
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
		{
			name:     "empty path",
			column:   "data",
			path:     "",
			expected: `jsonb_typeof("data")`,
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
		{
			name:     "empty path",
			column:   "data",
			path:     "",
			expected: `jsonb_typeof("data") = 'array'`,
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
			expected: `jsonb_array_elements_text("data") AS "str"`,
		},
		{
			name:     "root path empty",
			column:   "data",
			path:     "",
			alias:    "str",
			expected: `jsonb_array_elements_text("data") AS "str"`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.strings",
			alias:    "s",
			expected: `jsonb_array_elements_text("metadata"->'strings') AS "s"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
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
			expected: `jsonb_each("data") AS "k"`,
		},
		{
			name:     "root path empty",
			column:   "data",
			path:     "",
			alias:    "k",
			expected: `jsonb_each("data") AS "k"`,
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.object",
			alias:    "key",
			expected: `jsonb_each("metadata"->'object') AS "key"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
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

func TestJSONArrayLiteral(t *testing.T) {
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

func TestConvertJSONPathToPostgresWithMode(t *testing.T) {
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
			got := string(f.convertJSONPathToPostgresWithMode(tt.jsonPath, tt.asText))
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
			expected: `"data"::jsonb`,
		},
		{
			name:     "column with underscore",
			column:   "user_data",
			expected: `"user_data"::jsonb`,
		},
		{
			name:     "column with special characters",
			column:   "json-col",
			expected: `"json-col"::jsonb`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
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
			name:     "simple column name",
			expr:     "name",
			expected: "lower(name)",
		},
		{
			name:     "quoted column identifier",
			expr:     `"column_name"`,
			expected: `lower("column_name")`,
		},
		{
			name:     "jsonb text extraction",
			expr:     "data->>'field'",
			expected: "lower(data->>'field')",
		},
		{
			name:     "nested jsonb extraction",
			expr:     "metadata->'user'->>'name'",
			expected: "lower(metadata->'user'->>'name')",
		},
		{
			name:     "jsonb_typeof expression",
			expr:     "jsonb_typeof(data->'field')",
			expected: "lower(jsonb_typeof(data->'field'))",
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
		{
			name:     "subquery column",
			expr:     "users.email",
			expected: "lower(users.email)",
		},
		{
			name:     "quoted identifier with special chars",
			expr:     `"user-name"`,
			expected: `lower("user-name")`,
		},
		{
			name:     "jsonb to text cast",
			expr:     "data::text",
			expected: "lower(data::text)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(pgdialect.New())
			got := string(f.LowerExpression(tt.expr))
			assert.Equal(t, tt.expected, got)
		})
	}
}
