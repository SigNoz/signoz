package sqlitesqlstore

import (
	"testing"

	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/schema"
)

func TestFormatter_JSONExtractString(t *testing.T) {
	f := &Formatter{
		bunf: schema.NewFormatter(sqlitedialect.New()),
	}

	tests := []struct {
		name   string
		column string
		path   string
		want   string
	}{
		{
			name:   "simple path",
			column: "data",
			path:   "$.field",
			want:   `json_extract("data", '$.field')`,
		},
		{
			name:   "nested path",
			column: "metadata",
			path:   "$.user.name",
			want:   `json_extract("metadata", '$.user.name')`,
		},
		{
			name:   "root path",
			column: "json_col",
			path:   "$",
			want:   `json_extract("json_col", '$')`,
		},
		{
			name:   "array index path",
			column: "items",
			path:   "$.list[0]",
			want:   `json_extract("items", '$.list[0]')`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := string(f.JSONExtractString(tt.column, tt.path))
			if got != tt.want {
				t.Errorf("JSONExtractString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONType(t *testing.T) {
	f := &Formatter{
		bunf: schema.NewFormatter(sqlitedialect.New()),
	}

	tests := []struct {
		name   string
		column string
		path   string
		want   string
	}{
		{
			name:   "simple path",
			column: "data",
			path:   "$.field",
			want:   `json_type("data", '$.field')`,
		},
		{
			name:   "nested path",
			column: "metadata",
			path:   "$.user.age",
			want:   `json_type("metadata", '$.user.age')`,
		},
		{
			name:   "root path",
			column: "json_col",
			path:   "$",
			want:   `json_type("json_col", '$')`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := string(f.JSONType(tt.column, tt.path))
			if got != tt.want {
				t.Errorf("JSONType() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONIsArray(t *testing.T) {
	f := &Formatter{
		bunf: schema.NewFormatter(sqlitedialect.New()),
	}

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
			got := string(f.JSONIsArray(tt.column, tt.path))
			if got != tt.want {
				t.Errorf("JSONIsArray() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONArrayElements(t *testing.T) {
	f := &Formatter{
		bunf: schema.NewFormatter(sqlitedialect.New()),
	}

	tests := []struct {
		name   string
		column string
		path   string
		alias  string
		want   string
	}{
		{
			name:   "root path with dollar sign",
			column: "data",
			path:   "$",
			alias:  "elem",
			want:   `json_each("data") AS "elem"`,
		},
		{
			name:   "root path empty",
			column: "data",
			path:   "",
			alias:  "elem",
			want:   `json_each("data") AS "elem"`,
		},
		{
			name:   "nested path",
			column: "metadata",
			path:   "$.items",
			alias:  "item",
			want:   `json_each("metadata", '$.items') AS "item"`,
		},
		{
			name:   "deeply nested path",
			column: "json_col",
			path:   "$.user.tags",
			alias:  "tag",
			want:   `json_each("json_col", '$.user.tags') AS "tag"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, _ := f.JSONArrayElements(tt.column, tt.path, tt.alias)
			if string(got) != tt.want {
				t.Errorf("JSONArrayElements() = %v, want %v", string(got), tt.want)
			}
		})
	}
}

func TestFormatter_JSONArrayAgg(t *testing.T) {
	f := &Formatter{
		bunf: schema.NewFormatter(sqlitedialect.New()),
	}

	tests := []struct {
		name       string
		expression string
		want       string
	}{
		{
			name:       "simple column",
			expression: "id",
			want:       "json_group_array(id)",
		},
		{
			name:       "expression with function",
			expression: "DISTINCT name",
			want:       "json_group_array(DISTINCT name)",
		},
		{
			name:       "complex expression",
			expression: "json_extract(data, '$.field')",
			want:       "json_group_array(json_extract(data, '$.field'))",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := string(f.JSONArrayAgg(tt.expression))
			if got != tt.want {
				t.Errorf("JSONArrayAgg() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONArrayLiteral(t *testing.T) {
	f := &Formatter{
		bunf: schema.NewFormatter(sqlitedialect.New()),
	}

	tests := []struct {
		name   string
		values []string
		want   string
	}{
		{
			name:   "empty array",
			values: []string{},
			want:   "json_array()",
		},
		{
			name:   "single value",
			values: []string{"value1"},
			want:   "json_array('value1')",
		},
		{
			name:   "multiple values",
			values: []string{"value1", "value2", "value3"},
			want:   "json_array('value1', 'value2', 'value3')",
		},
		{
			name:   "values with special characters",
			values: []string{"test", "with space", "with-dash"},
			want:   "json_array('test', 'with space', 'with-dash')",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := string(f.JSONArrayLiteral(tt.values...))
			if got != tt.want {
				t.Errorf("JSONArrayLiteral() = %v, want %v", got, tt.want)
			}
		})
	}
}
