package sqlstoretest

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func TestJSONExtractMapValue(t *testing.T) {
	tests := []struct {
		name     string
		column   string
		mapField string
		key      string
		expected string
	}{
		{
			name:     "plain key",
			column:   "data",
			mapField: "labels",
			key:      "team",
			expected: `json_extract("data", '$.labels."team"')`,
		},
		{
			name:     "dotted key stays one map entry",
			column:   "data",
			mapField: "labels",
			key:      "k8s.cluster",
			expected: `json_extract("data", '$.labels."k8s.cluster"')`,
		},
		{
			name:     "backslash in key is escaped",
			column:   "data",
			mapField: "labels",
			key:      `a\b`,
			expected: `json_extract("data", '$.labels."a\\b"')`,
		},
		{
			name:     "single quote in key is doubled",
			column:   "data",
			mapField: "labels",
			key:      "o'brien",
			expected: `json_extract("data", '$.labels."o''brien"')`,
		},
		{
			name:     "qualified column",
			column:   "rule.data",
			mapField: "labels",
			key:      "severity",
			expected: `json_extract("rule"."data", '$.labels."severity"')`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := newFormatter(sqlitedialect.New())
			got := string(f.JSONExtractMapValue(tt.column, tt.mapField, tt.key))
			assert.Equal(t, tt.expected, got)
		})
	}
}
