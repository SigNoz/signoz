package sqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/schema"
)

func TestTableToCreateSQL(t *testing.T) {
	testCases := []struct {
		name  string
		table Table
		sql   string
	}{
		{
			name: "NonNullableColumnsWithPrimaryKey",
			table: Table{
				Name: "test",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false},
					{Name: "name", DataType: DataTypeText, Nullable: false},
					{Name: "org_id", DataType: DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					TableName:   "test",
					ColumnNames: []string{"id"},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "test" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_test" PRIMARY KEY ("id"))`,
		},
		{
			name: "NonNullableColumnsWithPrimaryKeyAndForeignKey",
			table: Table{
				Name: "test",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false},
					{Name: "name", DataType: DataTypeText, Nullable: false},
					{Name: "org_id", DataType: DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					TableName:   "test",
					ColumnNames: []string{"id"},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{
						ReferencingTableName:  "test",
						ReferencingColumnName: "org_id",
						ReferencedTableName:   "organizations",
						ReferencedColumnName:  "id",
					},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "test" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_test" PRIMARY KEY ("id"), CONSTRAINT "fk_test_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
		},
		{
			name: "NonNullableColumnsWithPrimaryKeyAndMultipleForeignKeys",
			table: Table{
				Name: "test",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false},
					{Name: "name", DataType: DataTypeText, Nullable: false},
					{Name: "org_id", DataType: DataTypeText, Nullable: false},
					{Name: "user_id", DataType: DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					TableName:   "test",
					ColumnNames: []string{"id"},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{
						ReferencingTableName:  "test",
						ReferencingColumnName: "org_id",
						ReferencedTableName:   "organizations",
						ReferencedColumnName:  "id",
					},
					{
						ReferencingTableName:  "test",
						ReferencingColumnName: "user_id",
						ReferencedTableName:   "users",
						ReferencedColumnName:  "id",
					},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "test" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "org_id" TEXT NOT NULL, "user_id" TEXT NOT NULL, CONSTRAINT "pk_test" PRIMARY KEY ("id"), CONSTRAINT "fk_test_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"), CONSTRAINT "fk_test_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id"))`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sql := testCase.table.ToCreateSQL(fmter)

			assert.Equal(t, testCase.sql, string(sql))
		})
	}
}

func TestTableToCreateTempInsertDropAlterSQL(t *testing.T) {
	testCases := []struct {
		name  string
		table Table
		sqls  []string
	}{
		{
			name: "NonNullableColumnsWithPrimaryKeyAndForeignKey",
			table: Table{
				Name: "test",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false},
					{Name: "name", DataType: DataTypeText, Nullable: false},
					{Name: "org_id", DataType: DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					TableName:   "test",
					ColumnNames: []string{"id"},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{
						ReferencingTableName:  "test",
						ReferencingColumnName: "org_id",
						ReferencedTableName:   "organizations",
						ReferencedColumnName:  "id",
					},
				},
			},
			sqls: []string{
				`CREATE TABLE IF NOT EXISTS "test__temp" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_test" PRIMARY KEY ("id"), CONSTRAINT "fk_test_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`INSERT INTO "test__temp" ("id", "name", "org_id") SELECT "id", "name", "org_id" FROM "test"`,
				`DROP TABLE IF EXISTS "test"`,
				`ALTER TABLE "test__temp" RENAME TO "test"`,
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sqls := testCase.table.ToCreateTempInsertDropAlterSQL(fmter)

			for i, sql := range sqls {
				assert.Equal(t, testCase.sqls[i], string(sql))
			}
		})
	}
}
