package mysqlsqlstore

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/dialect/mysqldialect"
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
			expected: "json_unquote(json_extract(`data`, '$.field'))",
		},
		{
			name:     "nested path",
			column:   "metadata",
			path:     "$.user.name",
			expected: "json_unquote(json_extract(`metadata`, '$.user.name'))",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(mysqldialect.New())
			got := string(f.JSONExtractString(tt.column, tt.path))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestJSONExtractMapValue(t *testing.T) {
	tests := []struct {
		name     string
		column   string
		mapField string
		key      string
		expected string
	}{
		{
			name:     "PlainKey",
			column:   "data",
			mapField: "labels",
			key:      "team",
			expected: `json_unquote(json_extract(` + "`data`, '$.labels.\"team\"'))",
		},
		{
			name:     "DottedKey",
			column:   "data",
			mapField: "labels",
			key:      "k8s.cluster",
			expected: `json_unquote(json_extract(` + "`data`, '$.labels.\"k8s.cluster\"'))",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(mysqldialect.New())
			got := string(f.JSONExtractMapValue(tt.column, tt.mapField, tt.key))
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestJSONType(t *testing.T) {
	f := newFormatter(mysqldialect.New())
	got := string(f.JSONType("data", "$.tags"))
	assert.Equal(t, "json_type(json_extract(`data`, '$.tags'))", got)
}

func TestJSONIsArray(t *testing.T) {
	f := newFormatter(mysqldialect.New())
	got := string(f.JSONIsArray("data", "$.tags"))
	assert.Equal(t, "json_type(json_extract(`data`, '$.tags')) = 'ARRAY'", got)
}

func TestJSONArrayAgg(t *testing.T) {
	f := newFormatter(mysqldialect.New())
	got := string(f.JSONArrayAgg("id"))
	assert.Equal(t, "json_arrayagg(id)", got)
}

func TestJSONArrayLiteral(t *testing.T) {
	f := newFormatter(mysqldialect.New())
	got := string(f.JSONArrayLiteral("a", "b"))
	assert.Equal(t, "json_array('a', 'b')", got)
}

func TestLowerExpression(t *testing.T) {
	f := newFormatter(mysqldialect.New())
	got := string(f.LowerExpression("col"))
	assert.Equal(t, "lower(col)", got)
}

func TestEscapeLikePattern(t *testing.T) {
	f := newFormatter(mysqldialect.New())
	assert.Equal(t, `100\%_test`, f.EscapeLikePattern(`100%_test`))
}

func TestTextToJsonColumn(t *testing.T) {
	f := newFormatter(mysqldialect.New())
	assert.Equal(t, "cast(`col` as json)", string(f.TextToJsonColumn("col")))
}
