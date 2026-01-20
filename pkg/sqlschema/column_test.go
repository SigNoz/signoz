package sqlschema

import (
	"testing"
	"time"

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

func TestColumnToUpdateSQL(t *testing.T) {
	testCases := []struct {
		name      string
		column    Column
		tableName TableName
		value     any
		sql       string
	}{
		{
			name:      "Timestamp",
			column:    Column{Name: "ts", DataType: DataTypeTimestamp},
			tableName: "test",
			value:     time.Time{},
			sql:       `UPDATE "test" SET "ts" = '0001-01-01 00:00:00+00:00'`,
		},
		{
			name:      "Integer",
			column:    Column{Name: "i", DataType: DataTypeInteger},
			tableName: "test",
			value:     1,
			sql:       `UPDATE "test" SET "i" = 1`,
		},
		{
			name:      "Text",
			column:    Column{Name: "t", DataType: DataTypeText},
			tableName: "test",
			value:     "test",
			sql:       `UPDATE "test" SET "t" = 'test'`,
		},
		{
			name:      "BigInt",
			column:    Column{Name: "bi", DataType: DataTypeBigInt},
			tableName: "test",
			value:     1,
			sql:       `UPDATE "test" SET "bi" = 1`,
		},
		{
			name:      "Numeric",
			column:    Column{Name: "n", DataType: DataTypeNumeric},
			tableName: "test",
			value:     1.1,
			sql:       `UPDATE "test" SET "n" = 1.1`,
		},
		{
			name:      "Boolean",
			column:    Column{Name: "b", DataType: DataTypeBoolean},
			tableName: "test",
			value:     true,
			sql:       `UPDATE "test" SET "b" = TRUE`,
		},
		{
			name:      "Null",
			column:    Column{Name: "n", DataType: DataTypeNumeric},
			tableName: "test",
			value:     nil,
			sql:       `UPDATE "test" SET "n" = NULL`,
		},
		{
			name:      "ColumnName",
			column:    Column{Name: "n", DataType: DataTypeNumeric},
			tableName: "test",
			value:     ColumnName("n"),
			sql:       `UPDATE "test" SET "n" = "n"`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sql := testCase.column.ToUpdateSQL(fmter, testCase.tableName, testCase.value)

			assert.Equal(t, testCase.sql, string(sql))
		})
	}
}
