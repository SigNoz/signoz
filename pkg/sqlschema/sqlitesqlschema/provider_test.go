package sqlitesqlschema

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestExtractWhereClause(t *testing.T) {
	testCases := []struct {
		name  string
		sql   string
		where string
	}{
		{
			name:  "UppercaseWhere",
			sql:   `CREATE UNIQUE INDEX "idx" ON "users" ("email") WHERE "deleted_at" IS NULL`,
			where: `"deleted_at" IS NULL`,
		},
		{
			name:  "LowercaseWhere",
			sql:   `CREATE UNIQUE INDEX "idx" ON "users" ("email") where "deleted_at" IS NULL`,
			where: `"deleted_at" IS NULL`,
		},
		{
			name:  "NewlineBeforeWhere",
			sql:   "CREATE UNIQUE INDEX \"idx\" ON \"users\" (\"email\")\nWHERE \"deleted_at\" IS NULL",
			where: `"deleted_at" IS NULL`,
		},
		{
			name:  "ExtraWhitespace",
			sql:   "CREATE UNIQUE INDEX \"idx\" ON \"users\" (\"email\")   \n \t where   \"deleted_at\" IS NULL  ",
			where: `"deleted_at" IS NULL`,
		},
		{
			name:  "WhereInStringLiteral",
			sql:   `CREATE UNIQUE INDEX "idx" ON "users" ("email") WHERE status = 'somewhere'`,
			where: `status = 'somewhere'`,
		},
		{
			name:  "BooleanLiteral",
			sql:   `CREATE UNIQUE INDEX "idx" ON "users" ("email") WHERE active = true`,
			where: `active = true`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.where, extractWhereClause(testCase.sql))
		})
	}
}
