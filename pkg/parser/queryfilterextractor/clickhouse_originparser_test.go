package queryfilterextractor

import (
	"testing"
)

func TestExtractOriginField(t *testing.T) {
	tests := []struct {
		name        string
		query       string
		expected    string
		expectError bool
	}{
		// JSON extraction functions - should return the second argument (JSON path/key) as origin field
		{
			name:     "JSONExtractString simple",
			query:    `SELECT JSONExtractString(labels, 'service.name')`,
			expected: "service.name",
		},
		{
			name:     "JSONExtractInt",
			query:    `SELECT JSONExtractInt(labels, 'status.code')`,
			expected: "status.code",
		},
		{
			name:     "JSONExtractFloat",
			query:    `SELECT JSONExtractFloat(labels, 'cpu.usage')`,
			expected: "cpu.usage",
		},
		{
			name:     "JSONExtractBool",
			query:    `SELECT JSONExtractBool(labels, 'feature.enabled')`,
			expected: "feature.enabled",
		},
		{
			name:     "JSONExtractString with function wrapper",
			query:    `SELECT lower(JSONExtractString(labels, 'user.email'))`,
			expected: "user.email",
		},
		{
			name:     "Nested JSON extraction",
			query:    `SELECT JSONExtractInt(JSONExtractRaw(labels, 'meta'), 'status.code')`,
			expected: "", // Nested JSON extraction should return blank
		},

		// Nested functions - should return the deepest column
		{
			name:     "Nested time functions with column",
			query:    `SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), toIntervalSecond(60))`,
			expected: "", // Contains toStartOfInterval and toDateTime which are excluded
		},
		{
			name:     "Division with column",
			query:    `SELECT unix_milli / 1000`,
			expected: "unix_milli",
		},
		{
			name:     "Function with single column",
			query:    `SELECT lower(unix_milli)`,
			expected: "unix_milli",
		},
		{
			name:     "CAST with single column",
			query:    `SELECT CAST(unix_milli AS String)`,
			expected: "unix_milli",
		},
		{
			name:     "intDiv with single column",
			query:    `SELECT intDiv(unix_milli, 1000)`,
			expected: "unix_milli",
		},

		// Multiple columns - should return blank
		{
			name:     "Multiple columns in coalesce",
			query:    `SELECT (coalesce(cpu_usage, 0) + coalesce(mem_usage, 0)) / 2`,
			expected: "",
		},
		{
			name:     "Multiple columns in arithmetic",
			query:    `SELECT cpu_usage + mem_usage`,
			expected: "",
		},
		{
			name:     "Multiple columns in function",
			query:    `SELECT concat(first_name, last_name)`,
			expected: "",
		},

		// IF/CASE conditions - should return blank
		{
			name:     "IF with single column in condition",
			query:    `SELECT IF(error_count > 0, service, 'healthy')`,
			expected: "", // Multiple columns: error_count and service
		},
		{
			name:     "IF with JSON and multiple columns",
			query:    `SELECT if(JSONExtractInt(metadata, 'retry.count') > 3, toLower(JSONExtractString(metadata, 'user.id')), hostname)`,
			expected: "", // Multiple columns: metadata and hostname
		},
		{
			name:     "String literal should return string",
			query:    `SELECT 'constant'`,
			expected: "constant",
		},

		// No columns - should return blank
		{
			name:     "Number literal",
			query:    `SELECT 42`,
			expected: "",
		},
		{
			name:     "Multiple literals",
			query:    `SELECT 'constant', 42`,
			expected: "",
		},
		{
			name:     "Multiple string literals",
			query:    `SELECT 'constant', '42'`,
			expected: "",
		},

		// Excluded functions - should return blank
		{
			name:     "now() function",
			query:    `SELECT now()`,
			expected: "",
		},
		{
			name:     "today() function",
			query:    `SELECT today()`,
			expected: "",
		},
		{
			name:     "count aggregate",
			query:    `SELECT count(user_id)`,
			expected: "",
		},
		{
			name:     "sum aggregate",
			query:    `SELECT sum(amount)`,
			expected: "",
		},

		// Single column simple cases
		{
			name:     "Simple column reference",
			query:    `SELECT user_id`,
			expected: "user_id",
		},
		{
			name:     "Column with alias",
			query:    `SELECT user_id AS id`,
			expected: "user_id",
		},
		{
			name:     "Column in arithmetic with literals (multiplication)",
			query:    `SELECT unix_milli * 1000`,
			expected: "unix_milli",
		},

		// Edge cases
		{
			name:     "Nested functions with single column deep",
			query:    `SELECT upper(lower(trim(column_name)))`,
			expected: "column_name",
		},
		// Qualified column names (Path)
		{
			name:     "Column with table prefix",
			query:    `SELECT table.column_name`,
			expected: "column_name", // IndexOperation: extracts column name from Index field
		},
		{
			name:     "Qualified column in function",
			query:    `SELECT lower(table.column_name)`,
			expected: "column_name",
		},
		{
			name:     "Qualified column in arithmetic",
			query:    `SELECT table.column_name * 100`,
			expected: "column_name",
		},
		{
			name:     "Nested qualified column (schema.table.column)",
			query:    `SELECT schema.table.column_name`,
			expected: "column_name", // Should extract the final column name
		},
		{
			name:     "Multiple qualified columns",
			query:    `SELECT table1.column1 + table2.column2`,
			expected: "", // Multiple columns: column1 and column2
		},
		{
			name:     "Qualified column with CAST",
			query:    `SELECT CAST(table.column_name AS String)`,
			expected: "column_name",
		},
		{
			name:     "Multiple select items - return blank",
			query:    `SELECT JSONExtractString(labels, 'service.name'), unix_milli / 1000, cpu_usage + mem_usage`,
			expected: "",
		},

		// Error cases
		{
			name:        "Invalid SQL syntax",
			query:       `SELECT FROM table`,
			expectError: true,
		},
		{
			name:        "Malformed query",
			query:       `SELECT * FROM`,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractCHOriginFieldFromQuery(tt.query)

			if tt.expectError {
				if err == nil {
					t.Errorf("ExtractOriginField() expected error but got nil, result = %q", result)
				}
			} else {
				if err != nil {
					t.Errorf("ExtractOriginField() unexpected error: %v", err)
				}
				if result != tt.expected {
					t.Errorf("ExtractOriginField() = %q, want %q", result, tt.expected)
				}
			}
		})
	}
}
