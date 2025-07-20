package sqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/schema"
)

// See table_test.go for more test cases on creating tables.
func TestOperatorCreateTable(t *testing.T) {
	testCases := []struct {
		name         string
		table        *Table
		expectedSQLs [][]byte
	}{
		{
			name: "PrimaryKey_ForeignKey_NotNullable",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					ColumnNames: []ColumnName{"id"},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
			expectedSQLs: [][]byte{
				[]byte(`CREATE TABLE IF NOT EXISTS "users" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL, "org_id" INTEGER NOT NULL, CONSTRAINT "pk_users" PRIMARY KEY ("id"), CONSTRAINT "fk_users_org_id" FOREIGN KEY ("org_id") REFERENCES "orgs" ("id"))`),
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := NewFormatter(schema.NewNopFormatter().Dialect())
			operator := NewOperator(fmter, OperatorSupport{})

			actuals := operator.CreateTable(testCase.table)
			assert.Equal(t, testCase.expectedSQLs, actuals)
		})
	}
}

func TestOperatorAddColumn(t *testing.T) {
	testCases := []struct {
		name              string
		table             *Table
		column            *Column
		val               any
		uniqueConstraints []*UniqueConstraint
		support           OperatorSupport
		expectedSQLs      [][]byte
		expectedTable     *Table
	}{
		{
			name: "NullableNoDefault_DoesNotExist_SAlterTableAddDropColumnIfNotExistsAndExistsTrue_SAlterTableAlterColumnSetAndDropTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
			val:    nil,
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: true,
				SAlterTableAlterColumnSetAndDrop:             true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
			},
		},
		{
			name: "MismatchingDataType_DoesExist_SAlterTableAddDropColumnIfNotExistsAndExistsTrue_SAlterTableAlterColumnSetAndDropTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
			},
			column: &Column{Name: "name", DataType: DataTypeBigInt, Nullable: true, Default: ""},
			val:    nil,
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: true,
				SAlterTableAlterColumnSetAndDrop:             true,
			},
			expectedSQLs: [][]byte{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
			},
		},
		{
			name: "NotNullableNoDefaultNoVal_DoesNotExist_SAlterTableAddDropColumnIfNotExistsAndExistsTrue_SAlterTableAlterColumnSetAndDropTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
			val:    nil,
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: true,
				SAlterTableAlterColumnSetAndDrop:             true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT`),
				[]byte(`UPDATE "users" SET "name" = ''`),
				[]byte(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "NotNullableNoDefault_DoesNotExist_SAlterTableAddDropColumnIfNotExistsAndExistsTrue_SAlterTableAlterColumnSetAndDropTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "num", DataType: DataTypeInteger, Nullable: false, Default: ""},
			val:    int64(100),
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: true,
				SAlterTableAlterColumnSetAndDrop:             true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "num" INTEGER`),
				[]byte(`UPDATE "users" SET "num" = 100`),
				[]byte(`ALTER TABLE "users" ALTER COLUMN "num" SET NOT NULL`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "num", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "NotNullableNoDefault_DoesNotExist_SAlterTableAddDropColumnIfNotExistsAndExistsTrue_SAlterTableAlterColumnSetAndDropFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "num", DataType: DataTypeInteger, Nullable: false, Default: ""},
			val:    int64(100),
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"name"}},
			},
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: true,
				SAlterTableAlterColumnSetAndDrop:             false,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "num" INTEGER`),
				[]byte(`UPDATE "users" SET "num" = 100`),
				[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL, "num" INTEGER NOT NULL)`),
				[]byte(`INSERT INTO "users__temp" ("id", "name", "num") SELECT "id", "name", "num" FROM "users"`),
				[]byte(`DROP TABLE IF EXISTS "users"`),
				[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_name" ON "users" ("name")`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
					{Name: "num", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "MismatchingDataType_DoesExist_SAlterTableAddDropColumnIfNotExistsAndExistsTrue_SAlterTableAlterColumnSetAndDropFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
			},
			column: &Column{Name: "name", DataType: DataTypeBigInt, Nullable: false, Default: ""},
			val:    nil,
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: true,
				SAlterTableAlterColumnSetAndDrop:             false,
			},
			expectedSQLs: [][]byte{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := NewFormatter(schema.NewNopFormatter().Dialect())
			operator := NewOperator(fmter, testCase.support)

			actuals := operator.AddColumn(testCase.table, testCase.uniqueConstraints, testCase.column, testCase.val)
			assert.Equal(t, testCase.expectedSQLs, actuals)
			assert.Equal(t, testCase.expectedTable, testCase.table)
		})
	}
}

func TestOperatorDropConstraint(t *testing.T) {
	testCases := []struct {
		name              string
		table             *Table
		constraint        Constraint
		uniqueConstraints []*UniqueConstraint
		support           OperatorSupport
		expectedSQLs      [][]byte
		expectedTable     *Table
	}{
		{
			name: "PrimaryKeyConstraint_DoesExist_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					ColumnNames: []ColumnName{"id"},
				},
			},
			constraint: &PrimaryKeyConstraint{
				ColumnNames: []ColumnName{"id"},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "pk_users"`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "PrimaryKeyConstraint_DoesNotExist_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			constraint: &PrimaryKeyConstraint{
				ColumnNames: []ColumnName{"id"},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "PrimaryKeyConstraintDifferentName_DoesExist_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					ColumnNames: []ColumnName{"id"},
					name:        "pk_users_different_name",
				},
			},
			constraint: &PrimaryKeyConstraint{
				ColumnNames: []ColumnName{"id"},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "pk_users_different_name"`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "PrimaryKeyConstraint_DoesExist_SCreateAndDropConstraintFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					ColumnNames: []ColumnName{"id"},
				},
			},
			constraint: &PrimaryKeyConstraint{
				ColumnNames: []ColumnName{"id"},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: false,
			},
			expectedSQLs: [][]byte{
				[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL)`),
				[]byte(`INSERT INTO "users__temp" ("id") SELECT "id" FROM "users"`),
				[]byte(`DROP TABLE IF EXISTS "users"`),
				[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "PrimaryKeyConstraint_DoesNotExist_SCreateAndDropConstraintFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			constraint: &PrimaryKeyConstraint{
				ColumnNames: []ColumnName{"id"},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: false,
			},
			expectedSQLs: [][]byte{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "UniqueConstraint_DoesExist_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			constraint: &UniqueConstraint{
				ColumnNames: []ColumnName{"name"},
			},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"name"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "uq_users_name"`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "UniqueConstraint_DoesNotExist_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			constraint: &UniqueConstraint{
				ColumnNames: []ColumnName{"name"},
			},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"id"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "UniqueConstraint_DoesExist_SCreateAndDropConstraintFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			constraint: &UniqueConstraint{
				ColumnNames: []ColumnName{"name"},
			},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"name"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: false,
			},
			expectedSQLs: [][]byte{
				[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL)`),
				[]byte(`INSERT INTO "users__temp" ("id", "name") SELECT "id", "name" FROM "users"`),
				[]byte(`DROP TABLE IF EXISTS "users"`),
				[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "UniqueConstraint_DoesNotExist_SCreateAndDropConstraintFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			constraint: &UniqueConstraint{
				ColumnNames: []ColumnName{"name"},
			},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"id"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: false,
			},
			expectedSQLs: [][]byte{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
		},
		{
			name: "ForeignKeyConstraint_DoesExist_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
			constraint: &ForeignKeyConstraint{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"id"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_org_id"`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
		},
		{
			name: "ForeignKeyConstraintDifferentName_DoesExist_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id", name: "my_fk"},
				},
			},
			constraint: &ForeignKeyConstraint{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"id"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "my_fk"`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
		},
		{
			name: "ForeignKeyConstraint_DoesNotExist_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
			// Note that the name of the referencing column is different from the one in the table.
			constraint: &ForeignKeyConstraint{ReferencingColumnName: "orgid", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"id"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
		},
		{
			name: "ForeignKeyConstraint_DoesExist_SCreateAndDropConstraintFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
			constraint: &ForeignKeyConstraint{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"id"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: false,
			},
			expectedSQLs: [][]byte{
				[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "org_id" INTEGER NOT NULL)`),
				[]byte(`INSERT INTO "users__temp" ("id", "org_id") SELECT "id", "org_id" FROM "users"`),
				[]byte(`DROP TABLE IF EXISTS "users"`),
				[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				// Note that a unique index is created because a unique constraint already existed for the table.
				[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_id" ON "users" ("id")`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
		},
		{
			name: "ForeignKeyConstraintDifferentName_DoesExist_SCreateAndDropConstraintFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id", name: "my_fk"},
				},
			},
			constraint: &ForeignKeyConstraint{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"id"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: false,
			},
			expectedSQLs: [][]byte{
				[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "org_id" INTEGER NOT NULL)`),
				[]byte(`INSERT INTO "users__temp" ("id", "org_id") SELECT "id", "org_id" FROM "users"`),
				[]byte(`DROP TABLE IF EXISTS "users"`),
				[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				// Note that a unique index is created because a unique constraint already existed for the table.
				[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_id" ON "users" ("id")`),
			},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
		},
		{
			name: "ForeignKeyConstraint_DoesNotExist_SCreateAndDropConstraintFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
			// Note that the name of the referencing column is different from the one in the table.
			constraint: &ForeignKeyConstraint{ReferencingColumnName: "orgid", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"id"}},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: false,
			},
			expectedSQLs: [][]byte{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := NewFormatter(schema.NewNopFormatter().Dialect())
			operator := NewOperator(fmter, testCase.support)

			actuals := operator.DropConstraint(testCase.table, testCase.uniqueConstraints, testCase.constraint)
			assert.Equal(t, testCase.expectedSQLs, actuals)
			assert.Equal(t, testCase.expectedTable, testCase.table)
		})
	}
}

func TestOperatorAlterTable(t *testing.T) {
	testCases := []struct {
		name              string
		table             *Table
		uniqueConstraints []*UniqueConstraint
		newTable          *Table
		support           OperatorSupport
		expectedSQLs      [][]byte
	}{
		{
			name: "NoOperation",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			support:      OperatorSupport{},
			expectedSQLs: [][]byte{},
		},
		{
			name: "AddColumn_NullableNoDefault_SAlterTableAddDropColumnIfNotExistsAndExistsTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
					{Name: "age", DataType: DataTypeInteger, Nullable: true, Default: ""},
				},
			},
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age" INTEGER`),
			},
		},
		{
			name: "AddColumn_NullableNoDefault_SAlterTableAddDropColumnIfNotExistsAndExistsFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
					{Name: "age", DataType: DataTypeInteger, Nullable: true, Default: ""},
				},
			},
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: false,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" ADD COLUMN "age" INTEGER`),
			},
		},
		{
			name: "CreatePrimaryKeyConstraint_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					ColumnNames: []ColumnName{"id"},
				},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" ADD CONSTRAINT "pk_users" PRIMARY KEY ("id")`),
			},
		},
		{
			name: "CreatePrimaryKeyConstraint_SCreateAndDropConstrainttFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{
					ColumnNames: []ColumnName{"id"},
				},
			},
			support: OperatorSupport{
				SCreateAndDropConstraint: false,
			},
			expectedSQLs: [][]byte{
				[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, CONSTRAINT "pk_users" PRIMARY KEY ("id"))`),
				[]byte(`INSERT INTO "users__temp" ("id") SELECT "id" FROM "users"`),
				[]byte(`DROP TABLE IF EXISTS "users"`),
				[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
			},
		},
		{
			name: "DropPrimaryKeyConstraint_AlterColumn_SAlterTableAddDropColumnIfNotExistsAndExistsFalse_SAlterTableAlterColumnSetAndDropFalse_SCreateAndDropConstraintFalse",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"id"}},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: false,
				SAlterTableAlterColumnSetAndDrop:             false,
				SCreateAndDropConstraint:                     false,
			},
			expectedSQLs: [][]byte{
				// first drop to make the column nullable
				[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL, CONSTRAINT "pk_users" PRIMARY KEY ("id"))`),
				[]byte(`INSERT INTO "users__temp" ("id", "name") SELECT "id", "name" FROM "users"`),
				[]byte(`DROP TABLE IF EXISTS "users"`),
				[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				// second drop to remove the primary key constraint
				[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL)`),
				[]byte(`INSERT INTO "users__temp" ("id", "name") SELECT "id", "name" FROM "users"`),
				[]byte(`DROP TABLE IF EXISTS "users"`),
				[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
			},
		},
		{
			name: "DropPrimaryKeyConstraint_AlterColumn_SAlterTableAddDropColumnIfNotExistsAndExistsTrue_SAlterTableAlterColumnSetAndDropTrue_SCreateAndDropConstraintTrue",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"id"}},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
			},
			support: OperatorSupport{
				SAlterTableAddDropColumnIfNotExistsAndExists: true,
				SAlterTableAlterColumnSetAndDrop:             true,
				SCreateAndDropConstraint:                     true,
			},
			expectedSQLs: [][]byte{
				[]byte(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`),
				[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "pk_users"`),
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := NewFormatter(schema.NewNopFormatter().Dialect())
			operator := NewOperator(fmter, testCase.support)

			actuals := operator.AlterTable(testCase.table, testCase.uniqueConstraints, testCase.newTable)
			assert.Equal(t, testCase.expectedSQLs, actuals)
			assert.Equal(t, testCase.newTable, testCase.table)
		})
	}
}
