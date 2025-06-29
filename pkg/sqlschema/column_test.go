package sqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/schema"
)

func TestColumnToSQL(t *testing.T) {
	testCases := []struct {
		name   string
		column Column
		sql    string
	}{
		{
			name:   "Timestamp",
			column: Column{Name: "created_at", DataType: DataTypeTimestamp, Nullable: false},
			sql:    `"created_at" TIMESTAMP NOT NULL`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sql := testCase.column.ToSQL(fmter)

			assert.Equal(t, testCase.sql, string(sql))
		})
	}
}
