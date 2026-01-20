package sqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/schema"
)

func TestIndexToCreateSQL(t *testing.T) {
	testCases := []struct {
		name  string
		index Index
		sql   string
	}{
		{
			name: "Unique_1Column",
			index: &UniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"id"},
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_id" ON "users" ("id")`,
		},
		{
			name: "Unique_2Columns",
			index: &UniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"id", "name"},
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_id_name" ON "users" ("id", "name")`,
		},
		{
			name: "Unique_3Columns_Named",
			index: &UniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"id", "name", "email"},
				name:        "my_index",
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "my_index" ON "users" ("id", "name", "email")`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sql := testCase.index.ToCreateSQL(fmter)

			assert.Equal(t, testCase.sql, string(sql))
		})
	}
}
