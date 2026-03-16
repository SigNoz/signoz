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
			name: "PartialUnique_1Column",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_users_email" ON "users" ("email") WHERE "deleted_at" IS NULL`,
		},
		{
			name: "PartialUnique_2Columns",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"org_id", "email"},
				Where:       `"deleted_at" IS NULL`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_users_org_id_email" ON "users" ("org_id", "email") WHERE "deleted_at" IS NULL`,
		},
		{
			name: "PartialUnique_Named",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
				name:        "my_partial_index",
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "my_partial_index" ON "users" ("email") WHERE "deleted_at" IS NULL`,
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

func TestIndexEquals(t *testing.T) {
	testCases := []struct {
		name   string
		a      Index
		b      Index
		equals bool
	}{
		{
			name: "PartialUnique_Same",
			a: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
			},
			b: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
			},
			equals: true,
		},
		{
			name: "PartialUnique_DifferentWhere",
			a: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
			},
			b: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"active" = true`,
			},
			equals: false,
		},
		{
			name: "PartialUnique_NotEqual_Unique",
			a: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
			},
			b: &UniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
			},
			equals: false,
		},
		{
			name: "Unique_NotEqual_PartialUnique",
			a: &UniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
			},
			b: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
			},
			equals: false,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.equals, testCase.a.Equals(testCase.b))
		})
	}
}
