package sqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/schema"
)

func TestTableToCreateSQL(t *testing.T) {
	testCases := []struct {
		name  string
		table *Table
		sql   string
	}{
		{
			name: "NoPrimaryKey_NoForeignKey_Nullable_BooleanDefault",
			table: &Table{
				Name: "boolean_default",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "b", DataType: DataTypeBoolean, Nullable: true, Default: "false"},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "boolean_default" ("id" INTEGER NOT NULL, "b" BOOLEAN DEFAULT false)`,
		},
		{
			name: "NoPrimaryKey_NoForeignKey_Nullable_TextDefault",
			table: &Table{
				Name: "text_default",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "t", DataType: DataTypeText, Nullable: true, Default: "'text'"},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "text_default" ("id" INTEGER NOT NULL, "t" TEXT DEFAULT 'text')`,
		},
		{
			name: "NoPrimaryKey_NoForeignKey_Nullable_IntegerDefault",
			table: &Table{
				Name: "integer_default",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "i", DataType: DataTypeInteger, Nullable: true, Default: "1"},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "integer_default" ("id" INTEGER NOT NULL, "i" INTEGER DEFAULT 1)`,
		},
		{
			name: "NoPrimaryKey_NoForeignKey_Nullable_NumericDefault",
			table: &Table{
				Name: "numeric_default",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "n", DataType: DataTypeNumeric, Nullable: true, Default: "1.0"},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "numeric_default" ("id" INTEGER NOT NULL, "n" NUMERIC DEFAULT 1.0)`,
		},
		{
			name: "NoPrimaryKey_NoForeignKey_Nullable_TimestampDefault",
			table: &Table{
				Name: "timestamp_default",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "t", DataType: DataTypeTimestamp, Nullable: true, Default: "CURRENT_TIMESTAMP"},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "timestamp_default" ("id" INTEGER NOT NULL, "t" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
		},
		{
			name: "PrimaryKey_NonNullable",
			table: &Table{
				Name: "test",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false},
					{Name: "name", DataType: DataTypeText, Nullable: false},
					{Name: "org_id", DataType: DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					ColumnNames: []ColumnName{"id"},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "test" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_test" PRIMARY KEY ("id"))`,
		},
		{
			name: "PrimaryKey_ForeignKey_NonNullable",
			table: &Table{
				Name: "test",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false},
					{Name: "name", DataType: DataTypeText, Nullable: false},
					{Name: "org_id", DataType: DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"id"}},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "organizations", ReferencedColumnName: "id"},
				},
			},
			sql: `CREATE TABLE IF NOT EXISTS "test" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_test" PRIMARY KEY ("id"), CONSTRAINT "fk_test_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
		},
		{
			name: "PrimaryKey_MultipleForeignKeys_NonNullable",
			table: &Table{
				Name: "test",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false},
					{Name: "name", DataType: DataTypeText, Nullable: false},
					{Name: "org_id", DataType: DataTypeText, Nullable: false},
					{Name: "user_id", DataType: DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"id"}},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "organizations", ReferencedColumnName: "id"},
					{ReferencingColumnName: "user_id", ReferencedTableName: "users", ReferencedColumnName: "id"},
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
			name: "PrimaryKey_ForeignKey_NonNullable",
			table: Table{
				Name: "test",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false},
					{Name: "name", DataType: DataTypeText, Nullable: false},
					{Name: "org_id", DataType: DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					ColumnNames: []ColumnName{"id"},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{
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
