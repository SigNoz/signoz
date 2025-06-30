package sqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/schema"
)

func TestColumnToDefinitionSQL(t *testing.T) {
	testCases := []struct {
		name   string
		column Column
		sql    string
	}{
		{
			name:   "TimestampNotNullNoDefault",
			column: Column{Name: "created_at", DataType: DataTypeTimestamp, Nullable: false},
			sql:    `"created_at" TIMESTAMP NOT NULL`,
		},
		{
			name:   "TimestampNotNullWithDefault",
			column: Column{Name: "created_at", DataType: DataTypeTimestamp, Nullable: false, Default: "CURRENT_TIMESTAMP"},
			sql:    `"created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
		},
		{
			name:   "TimestampNullableNoDefault",
			column: Column{Name: "created_at", DataType: DataTypeTimestamp, Nullable: true},
			sql:    `"created_at" TIMESTAMP`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sql := testCase.column.ToDefinitionSQL(fmter)

			assert.Equal(t, testCase.sql, string(sql))
		})
	}
}
