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

func TestExtractIndexColumns(t *testing.T) {
	testCases := []struct {
		name    string
		sql     string
		columns []string
	}{
		{
			name:    "SingleColumn",
			sql:     `CREATE UNIQUE INDEX "idx" ON "users" ("email")`,
			columns: []string{`"email"`},
		},
		{
			name:    "SingleExpression",
			sql:     `CREATE UNIQUE INDEX "idx" ON "users" (LOWER(email))`,
			columns: []string{"LOWER(email)"},
		},
		{
			name:    "MixedColumnsAndExpressions",
			sql:     `CREATE UNIQUE INDEX "idx" ON "tag" (org_id, kind, LOWER(key), LOWER(value))`,
			columns: []string{"org_id", "kind", "LOWER(key)", "LOWER(value)"},
		},
		{
			name:    "CommaInsideStringLiteralNotSplit",
			sql:     `CREATE UNIQUE INDEX "idx" ON "users" (LOWER(TRIM(first_name) || ', ' || last_name))`,
			columns: []string{"LOWER(TRIM(first_name) || ', ' || last_name)"},
		},
		{
			name:    "CommaInsideQuotedIdentifierNotSplit",
			sql:     `CREATE UNIQUE INDEX "idx" ON "t" ("weird,col", LOWER(x))`,
			columns: []string{`"weird,col"`, "LOWER(x)"},
		},
		{
			name:    "WhereClauseAfterKeyListIgnored",
			sql:     `CREATE UNIQUE INDEX "idx" ON "tag" (LOWER(key)) WHERE deleted = 0`,
			columns: []string{"LOWER(key)"},
		},
		{
			name:    "WhereClauseWithParensAfterKeyListIgnored",
			sql:     `CREATE UNIQUE INDEX "idx" ON "tag" (LOWER(key)) WHERE (deleted = 0 AND kind = 'a')`,
			columns: []string{"LOWER(key)"},
		},
		{
			name:    "CommaInsideBacktickIdentifierNotSplit",
			sql:     "CREATE UNIQUE INDEX `idx` ON `t` (`weird,col`, x)",
			columns: []string{"`weird,col`", "x"},
		},
		{
			name:    "CommaInsideBracketIdentifierNotSplit",
			sql:     `CREATE UNIQUE INDEX [idx] ON [t] ([weird,col], x)`,
			columns: []string{"[weird,col]", "x"},
		},
		{
			name:    "EscapedDoubleQuoteInIdentifier",
			sql:     `CREATE UNIQUE INDEX "idx" ON "t" ("a""b", x)`,
			columns: []string{`"a""b"`, "x"},
		},
		{
			name:    "EscapedSingleQuoteInLiteral",
			sql:     `CREATE UNIQUE INDEX "idx" ON "t" (COALESCE(x, 'it''s, ok'))`,
			columns: []string{"COALESCE(x, 'it''s, ok')"},
		},
		{
			name:    "NestedFunctionCallCommasNotSplit",
			sql:     `CREATE UNIQUE INDEX "idx" ON "t" (COALESCE(a, b, c), d)`,
			columns: []string{"COALESCE(a, b, c)", "d"},
		},
		{
			name:    "NewlinesAndTabsTrimmed",
			sql:     "CREATE UNIQUE INDEX \"idx\" ON \"t\" (\n\tLOWER(key),\n\torg_id\n)",
			columns: []string{"LOWER(key)", "org_id"},
		},
		{
			name:    "CollateAndOrderSuffixKeptVerbatim",
			sql:     `CREATE UNIQUE INDEX "idx" ON "t" (LOWER(key) COLLATE NOCASE, value DESC)`,
			columns: []string{"LOWER(key) COLLATE NOCASE", "value DESC"},
		},
		{
			name:    "NoKeyListReturnsNil",
			sql:     `CREATE INDEX "idx" ON "t"`,
			columns: nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.columns, extractIndexColumns(testCase.sql))
		})
	}
}
