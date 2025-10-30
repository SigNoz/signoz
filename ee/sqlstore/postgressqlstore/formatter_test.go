package postgressqlstore

import (
	"testing"
)

func TestFormatter_JSONExtractString(t *testing.T) {
	f := formatter{}

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
			want:   "data->>'field'",
		},
		{
			name:   "nested path",
			column: "metadata",
			path:   "$.user.name",
			want:   "metadata->'user'->>'name'",
		},
		{
			name:   "deeply nested path",
			column: "json_col",
			path:   "$.level1.level2.level3",
			want:   "json_col->'level1'->'level2'->>'level3'",
		},
		{
			name:   "root path",
			column: "json_col",
			path:   "$",
			want:   "json_col",
		},
		{
			name:   "empty path",
			column: "data",
			path:   "",
			want:   "data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := f.JSONExtractString(tt.column, tt.path)
			if got != tt.want {
				t.Errorf("JSONExtractString() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONType(t *testing.T) {
	f := formatter{}

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
			want:   "jsonb_typeof(data->'field')",
		},
		{
			name:   "nested path",
			column: "metadata",
			path:   "$.user.age",
			want:   "jsonb_typeof(metadata->'user'->'age')",
		},
		{
			name:   "root path",
			column: "json_col",
			path:   "$",
			want:   "jsonb_typeof(json_col)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := f.JSONType(tt.column, tt.path)
			if got != tt.want {
				t.Errorf("JSONType() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONIsArray(t *testing.T) {
	f := formatter{}

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
			want:   "jsonb_typeof(data->'items') = 'array'",
		},
		{
			name:   "nested path",
			column: "metadata",
			path:   "$.user.tags",
			want:   "jsonb_typeof(metadata->'user'->'tags') = 'array'",
		},
		{
			name:   "root path",
			column: "json_col",
			path:   "$",
			want:   "jsonb_typeof(json_col) = 'array'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := f.JSONIsArray(tt.column, tt.path)
			if got != tt.want {
				t.Errorf("JSONIsArray() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONArrayElements(t *testing.T) {
	f := formatter{}

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
			want:   "jsonb_array_elements(data) AS elem",
		},
		{
			name:   "root path empty",
			column: "data",
			path:   "",
			alias:  "elem",
			want:   "jsonb_array_elements(data) AS elem",
		},
		{
			name:   "nested path",
			column: "metadata",
			path:   "$.items",
			alias:  "item",
			want:   "jsonb_array_elements(metadata->'items') AS item",
		},
		{
			name:   "deeply nested path",
			column: "json_col",
			path:   "$.user.tags",
			alias:  "tag",
			want:   "jsonb_array_elements(json_col->'user'->'tags') AS tag",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, _ := f.JSONArrayElements(tt.column, tt.path, tt.alias)
			if got != tt.want {
				t.Errorf("JSONArrayElements() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONArrayAgg(t *testing.T) {
	f := formatter{}

	tests := []struct {
		name       string
		expression string
		want       string
	}{
		{
			name:       "simple column",
			expression: "id",
			want:       "jsonb_agg(id)",
		},
		{
			name:       "expression with function",
			expression: "DISTINCT name",
			want:       "jsonb_agg(DISTINCT name)",
		},
		{
			name:       "complex expression",
			expression: "data->>'field'",
			want:       "jsonb_agg(data->>'field')",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := f.JSONArrayAgg(tt.expression)
			if got != tt.want {
				t.Errorf("JSONArrayAgg() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFormatter_JSONArrayLiteral(t *testing.T) {
	f := formatter{}

	tests := []struct {
		name   string
		values []string
		want   string
	}{
		{
			name:   "empty array",
			values: []string{},
			want:   "jsonb_build_array()",
		},
		{
			name:   "single value",
			values: []string{"value1"},
			want:   "jsonb_build_array('value1')",
		},
		{
			name:   "multiple values",
			values: []string{"value1", "value2", "value3"},
			want:   "jsonb_build_array('value1', 'value2', 'value3')",
		},
		{
			name:   "values with special characters",
			values: []string{"test", "with space", "with-dash"},
			want:   "jsonb_build_array('test', 'with space', 'with-dash')",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := f.JSONArrayLiteral(tt.values...)
			if got != tt.want {
				t.Errorf("JSONArrayLiteral() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestConvertJSONPathToPostgres(t *testing.T) {
	tests := []struct {
		name     string
		jsonPath string
		asText   bool
		want     string
	}{
		{
			name:     "simple path as text",
			jsonPath: "$.field",
			asText:   true,
			want:     "->>'field'",
		},
		{
			name:     "simple path as json",
			jsonPath: "$.field",
			asText:   false,
			want:     "->'field'",
		},
		{
			name:     "nested path as text",
			jsonPath: "$.user.name",
			asText:   true,
			want:     "->'user'->>'name'",
		},
		{
			name:     "nested path as json",
			jsonPath: "$.user.name",
			asText:   false,
			want:     "->'user'->'name'",
		},
		{
			name:     "deeply nested as text",
			jsonPath: "$.a.b.c.d",
			asText:   true,
			want:     "->'a'->'b'->'c'->>'d'",
		},
		{
			name:     "root path",
			jsonPath: "$",
			asText:   true,
			want:     "",
		},
		{
			name:     "empty path",
			jsonPath: "",
			asText:   true,
			want:     "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := convertJSONPathToPostgresWithMode(tt.jsonPath, tt.asText)
			if got != tt.want {
				t.Errorf("convertJSONPathToPostgresWithMode() = %v, want %v", got, tt.want)
			}
		})
	}
}
