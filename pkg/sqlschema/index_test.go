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
		{
			name: "Normal_1Column",
			index: &NormalIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"org_id"},
			},
			sql: `CREATE INDEX IF NOT EXISTS "ix_users_org_id" ON "users" ("org_id")`,
		},
		{
			name: "Normal_2Columns",
			index: &NormalIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"org_id", "status"},
			},
			sql: `CREATE INDEX IF NOT EXISTS "ix_users_org_id_status" ON "users" ("org_id", "status")`,
		},
		{
			name: "Normal_3Columns_Named",
			index: &NormalIndex{
				TableName:   "route_policy",
				ColumnNames: []ColumnName{"org_id", "enabled", "kind"},
				name:        "idx_custom_name",
			},
			sql: `CREATE INDEX IF NOT EXISTS "idx_custom_name" ON "route_policy" ("org_id", "enabled", "kind")`,
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
