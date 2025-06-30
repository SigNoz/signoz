package sqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/schema"
)

func TestPrimaryKeyConstraintToDefinitionSQL(t *testing.T) {
	testCases := []struct {
		name       string
		constraint *PrimaryKeyConstraint
		sql        string
	}{
		{
			name: "SingleColumn",
			constraint: &PrimaryKeyConstraint{
				TableName:   "test",
				ColumnNames: []string{"id"},
			},
			sql: `CONSTRAINT "pk_test" PRIMARY KEY ("id")`,
		},
		{
			name: "MultipleColumns",
			constraint: &PrimaryKeyConstraint{
				TableName:   "test",
				ColumnNames: []string{"id", "name"},
			},
			sql: `CONSTRAINT "pk_test" PRIMARY KEY ("id", "name")`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sql := testCase.constraint.ToDefinitionSQL(fmter)

			assert.Equal(t, testCase.sql, string(sql))
		})
	}
}

func TestForeignKeyConstraintToDefinitionSQL(t *testing.T) {
	testCases := []struct {
		name       string
		constraint *ForeignKeyConstraint
		sql        string
	}{
		{
			name: "NoCascade",
			constraint: &ForeignKeyConstraint{
				ReferencingTableName:  "test",
				ReferencingColumnName: "id",
				ReferencedTableName:   "test_referenced",
				ReferencedColumnName:  "id",
			},
			sql: `CONSTRAINT "fk_test_id" FOREIGN KEY ("id") REFERENCES "test_referenced" ("id")`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			fmter := Formatter{schema.NewNopFormatter()}
			sql := testCase.constraint.ToDefinitionSQL(fmter)

			assert.Equal(t, testCase.sql, string(sql))
		})
	}
}
