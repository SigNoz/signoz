package sqlschema

import (
	"testing"
	"time"

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
		expectedTable     *Table
		expected          map[OperatorSupport][][]byte
	}{
		{
			name: "NullableNoDefault_DoesNotExist",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
			val:    nil,
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN "name" TEXT`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT`),
				},
			},
		},
		{
			name: "MismatchingDataType_DoesExist",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
			},
			column: &Column{Name: "name", DataType: DataTypeBigInt, Nullable: true, Default: ""},
			val:    nil,
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}:    {},
			},
		},
		{
			name: "TextNotNullableNoDefaultNoVal_DoesNotExist",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
			val:    nil,
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN "name" TEXT`),
					[]byte(`UPDATE "users" SET "name" = ''`),
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL)`),
					[]byte(`INSERT INTO "users__temp" ("id", "name") SELECT "id", "name" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT`),
					[]byte(`UPDATE "users" SET "name" = ''`),
					[]byte(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`),
				},
			},
		},
		{
			name: "IntegerNotNullableNoDefaultNoVal_DoesNotExist",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "num", DataType: DataTypeInteger, Nullable: false, Default: ""},
			val:    nil,
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "num", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN "num" INTEGER`),
					[]byte(`UPDATE "users" SET "num" = 0`),
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "num" INTEGER NOT NULL)`),
					[]byte(`INSERT INTO "users__temp" ("id", "num") SELECT "id", "num" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "num" INTEGER`),
					[]byte(`UPDATE "users" SET "num" = 0`),
					[]byte(`ALTER TABLE "users" ALTER COLUMN "num" SET NOT NULL`),
				},
			},
		},
		{
			name: "IntegerNotNullableNoDefaultVal_DoesNotExist",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "num", DataType: DataTypeInteger, Nullable: false, Default: ""},
			val:    int64(100),
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "num", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN "num" INTEGER`),
					[]byte(`UPDATE "users" SET "num" = 100`),
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "num" INTEGER NOT NULL)`),
					[]byte(`INSERT INTO "users__temp" ("id", "num") SELECT "id", "num" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "num" INTEGER`),
					[]byte(`UPDATE "users" SET "num" = 100`),
					[]byte(`ALTER TABLE "users" ALTER COLUMN "num" SET NOT NULL`),
				},
			},
		},
		{
			name: "BooleanNotNullableNoDefaultValNoVal_DoesNotExist",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "is_admin", DataType: DataTypeBoolean, Nullable: false, Default: ""},
			val:    nil,
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "is_admin", DataType: DataTypeBoolean, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN`),
					// Set to the zero value
					[]byte(`UPDATE "users" SET "is_admin" = FALSE`),
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "is_admin" BOOLEAN NOT NULL)`),
					[]byte(`INSERT INTO "users__temp" ("id", "is_admin") SELECT "id", "is_admin" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN`),
					// Set to the zero value
					[]byte(`UPDATE "users" SET "is_admin" = FALSE`),
					[]byte(`ALTER TABLE "users" ALTER COLUMN "is_admin" SET NOT NULL`),
				},
			},
		},
		{
			name: "BooleanNullableDefaultVal_DoesNotExist",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "is_admin", DataType: DataTypeBoolean, Nullable: true, Default: "TRUE"},
			val:    nil,
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "is_admin", DataType: DataTypeBoolean, Nullable: true, Default: "TRUE"},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN DEFAULT TRUE`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN DEFAULT TRUE`),
				},
			},
		},
		{
			name: "TimestampNullableDefaultValAndVal_DoesNotExist",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			column: &Column{Name: "created_at", DataType: DataTypeTimestamp, Nullable: true, Default: "CURRENT_TIMESTAMP"},
			val:    time.Time{},
			expectedTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "created_at", DataType: DataTypeTimestamp, Nullable: true, Default: "CURRENT_TIMESTAMP"},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`),
					[]byte(`UPDATE "users" SET "created_at" = '0001-01-01 00:00:00+00:00'`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`),
					[]byte(`UPDATE "users" SET "created_at" = '0001-01-01 00:00:00+00:00'`),
				},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := NewFormatter(schema.NewNopFormatter().Dialect())

			for support, expectedSQLs := range testCase.expected {
				operator := NewOperator(fmter, support)
				clonedTable := testCase.table.Clone()

				actuals := operator.AddColumn(clonedTable, testCase.uniqueConstraints, testCase.column, testCase.val)
				assert.Equal(t, expectedSQLs, actuals)
				assert.Equal(t, testCase.expectedTable, clonedTable)
			}
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
		expected          map[OperatorSupport][][]byte
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
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}:    {},
			},
		},
		{
			name: "RenameTable",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
			},
			newTable: &Table{
				Name: "users_new",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" RENAME TO "users_new"`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" RENAME TO "users_new"`),
				},
			},
		},
		{
			name: "AddColumn_NullableNoDefault_SAlterTableAddAndDropColumnIfNotExistsAndExistsTrue",
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
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN "age" INTEGER`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age" INTEGER`),
				},
			},
		},
		{
			name: "CreatePrimaryKeyConstraint",
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
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, CONSTRAINT "pk_users" PRIMARY KEY ("id"))`),
					[]byte(`INSERT INTO "users__temp" ("id") SELECT "id" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" ADD CONSTRAINT "pk_users" PRIMARY KEY ("id")`),
				},
			},
		},
		{
			name: "DropPrimaryKeyConstraint_AlterColumnNullable",
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
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					// first drop to remove the primary key constraint
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT)`),
					[]byte(`INSERT INTO "users__temp" ("id", "name") SELECT "id", "name" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
					// second drop to make the column nullable
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL)`),
					[]byte(`INSERT INTO "users__temp" ("id", "name") SELECT "id", "name" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "pk_users"`),
					[]byte(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`),
				},
			},
		},
		{
			name: "DropForeignKeyConstraint_DropColumn",
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
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					// first drop to remove the foreign key constraint
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "org_id" INTEGER NOT NULL)`),
					[]byte(`INSERT INTO "users__temp" ("id", "org_id") SELECT "id", "org_id" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
					// second drop to remove the column
					[]byte(`ALTER TABLE "users" DROP COLUMN "org_id"`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					// first drop to remove the foreign key constraint
					[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_org_id"`),
					// second drop to remove the column
					[]byte(`ALTER TABLE "users" DROP COLUMN IF EXISTS "org_id"`),
				},
			},
		},
		{
			name: "DropMultipleConstraints",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
					{Name: "age", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "team_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"id"}},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
					{ReferencingColumnName: "team_id", ReferencedTableName: "teams", ReferencedColumnName: "id"},
				},
			},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"name", "age"}},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
					{Name: "age", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "org_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "team_id", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "team_id", ReferencedTableName: "teams", ReferencedColumnName: "id"},
				},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL, "age" INTEGER NOT NULL, "org_id" INTEGER NOT NULL, "team_id" INTEGER NOT NULL, CONSTRAINT "fk_users_team_id" FOREIGN KEY ("team_id") REFERENCES "teams" ("id"))`),
					[]byte(`INSERT INTO "users__temp" ("id", "name", "age", "org_id", "team_id") SELECT "id", "name", "age", "org_id", "team_id" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
					[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_name_age" ON "users" ("name", "age")`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "pk_users"`),
					[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_org_id"`),
					[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "uq_users_name_age"`),
					[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_name_age" ON "users" ("name", "age")`),
				},
			},
		},
		{
			name: "DropUniqueConstraints_AlterMultipleColumns",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: true, Default: ""},
					{Name: "age", DataType: DataTypeInteger, Nullable: true, Default: ""},
					{Name: "email", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"id"}},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
			uniqueConstraints: []*UniqueConstraint{
				{ColumnNames: []ColumnName{"email"}},
				{name: "my_name_constraint", ColumnNames: []ColumnName{"name"}},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeInteger, Nullable: false, Default: ""},
					{Name: "name", DataType: DataTypeText, Nullable: false, Default: ""},
					{Name: "age", DataType: DataTypeInteger, Nullable: false, Default: "0"},
					{Name: "email", DataType: DataTypeInteger, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"id"}},
				ForeignKeyConstraints: []*ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "orgs", ReferencedColumnName: "id"},
				},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					// first drop to remove unique constraint
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT, "age" INTEGER, "email" INTEGER NOT NULL, CONSTRAINT "pk_users" PRIMARY KEY ("id"), CONSTRAINT "fk_users_org_id" FOREIGN KEY ("org_id") REFERENCES "orgs" ("id"))`),
					[]byte(`INSERT INTO "users__temp" ("id", "name", "age", "email") SELECT "id", "name", "age", "email" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
					// second drop to change all columns
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" INTEGER NOT NULL, "name" TEXT NOT NULL, "age" INTEGER NOT NULL DEFAULT 0, "email" INTEGER NOT NULL, CONSTRAINT "pk_users" PRIMARY KEY ("id"), CONSTRAINT "fk_users_org_id" FOREIGN KEY ("org_id") REFERENCES "orgs" ("id"))`),
					[]byte(`INSERT INTO "users__temp" ("id", "name", "age", "email") SELECT "id", "name", "age", "email" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
					// create unique index for the constraint
					[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_email" ON "users" ("email")`),
					[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_name" ON "users" ("name")`),
				},
				{SCreateAndDropConstraint: true, SAlterTableAddAndDropColumnIfNotExistsAndExists: true, SAlterTableAlterColumnSetAndDrop: true}: {
					[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "uq_users_email"`),
					[]byte(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "my_name_constraint"`),
					[]byte(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`),
					[]byte(`ALTER TABLE "users" ALTER COLUMN "age" SET NOT NULL`),
					[]byte(`ALTER TABLE "users" ALTER COLUMN "age" SET DEFAULT 0`),
					[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_email" ON "users" ("email")`),
					[]byte(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_name" ON "users" ("name")`),
				},
			},
		},
		{
			name: "ChangePrimaryKeyConstraint",
			table: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "id", DataType: DataTypeText, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"id"}},
			},
			newTable: &Table{
				Name: "users",
				Columns: []*Column{
					{Name: "uuid", DataType: DataTypeText, Nullable: false, Default: ""},
				},
				PrimaryKeyConstraint: &PrimaryKeyConstraint{ColumnNames: []ColumnName{"uuid"}},
			},
			expected: map[OperatorSupport][][]byte{
				{SCreateAndDropConstraint: false, SAlterTableAddAndDropColumnIfNotExistsAndExists: false, SAlterTableAlterColumnSetAndDrop: false}: {
					// first drop to remove the primary key constraint
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" TEXT NOT NULL)`),
					[]byte(`INSERT INTO "users__temp" ("id") SELECT "id" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
					// drop the column
					[]byte(`ALTER TABLE "users" DROP COLUMN "id"`),
					// add the column
					[]byte(`ALTER TABLE "users" ADD COLUMN "uuid" TEXT`),
					[]byte(`UPDATE "users" SET "uuid" = ''`),
					// second drop to make it non-nullable
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("uuid" TEXT NOT NULL)`),
					[]byte(`INSERT INTO "users__temp" ("uuid") SELECT "uuid" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
					// third drop to add the primary key constraint
					[]byte(`CREATE TABLE IF NOT EXISTS "users__temp" ("id" TEXT NOT NULL, "uuid" TEXT NOT NULL DEFAULT '', CONSTRAINT "pk_users" PRIMARY KEY ("uuid"))`),
					[]byte(`INSERT INTO "users__temp" ("id", "uuid") SELECT "id", "uuid" FROM "users"`),
					[]byte(`DROP TABLE IF EXISTS "users"`),
					[]byte(`ALTER TABLE "users__temp" RENAME TO "users"`),
				},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := NewFormatter(schema.NewNopFormatter().Dialect())
			for support, sqls := range testCase.expected {
				operator := NewOperator(fmter, support)
				clonedTable := testCase.table.Clone()

				actuals := operator.AlterTable(clonedTable, testCase.uniqueConstraints, testCase.newTable)
				assert.Equal(t, sqls, actuals)
				assert.EqualValues(t, testCase.newTable, clonedTable)
			}
		})
	}
}
