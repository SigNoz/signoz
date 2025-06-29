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
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sql := testCase.table.ToCreateSQL(fmter)

			assert.Equal(t, testCase.sql, string(sql))
		})
	}
}
