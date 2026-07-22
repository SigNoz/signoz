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
			name: "Unique_Functional_SingleExpression",
			index: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_72852951" ON "users" (LOWER(email))`,
		},
		{
			name: "Unique_Functional_MixedColumnsAndExpressions",
			index: &UniqueIndexWithExpressions{
				TableName:   "tag",
				Expressions: []string{"org_id", "kind", "LOWER(key)", "LOWER(value)"},
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uq_tag_a36c51df" ON "tag" (org_id, kind, LOWER(key), LOWER(value))`,
		},
		{
			name: "Unique_Functional_ComplexExpression",
			index: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(TRIM(first_name) || ' ' || TRIM(last_name))"},
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_37e845f3" ON "users" (LOWER(TRIM(first_name) || ' ' || TRIM(last_name)))`,
		},
		{
			name: "Unique_Functional_Named",
			index: &UniqueIndexWithExpressions{
				TableName:   "tag",
				Expressions: []string{"org_id", "kind", "LOWER(key)", "LOWER(value)"},
				name:        "uq_tag_org_kind_lower_key_lower_value",
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uq_tag_org_kind_lower_key_lower_value" ON "tag" (org_id, kind, LOWER(key), LOWER(value))`,
		},
		{
			name: "PartialUnique_1Column",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_users_email_94610c77" ON "users" ("email") WHERE "deleted_at" IS NULL`,
		},
		{
			name: "PartialUnique_2Columns",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"org_id", "email"},
				Where:       `"deleted_at" IS NULL`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_users_org_id_email_94610c77" ON "users" ("org_id", "email") WHERE "deleted_at" IS NULL`,
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
		{
			name: "PartialUnique_WhereWithParentheses",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `("deleted_at" IS NULL)`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_users_email_94610c77" ON "users" ("email") WHERE ("deleted_at" IS NULL)`,
		},
		{
			name: "PartialUnique_WhereWithQuotedIdentifier",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"order" IS NULL`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_users_email_14c5f5f2" ON "users" ("email") WHERE "order" IS NULL`,
		},
		{
			name: "PartialUnique_WhereWithQuotedLiteral",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `status = 'somewhere'`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_users_email_9817c709" ON "users" ("email") WHERE status = 'somewhere'`,
		},
		{
			name: "PartialUnique_WhereWith2Columns",
			index: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email", "status"},
				Where:       `email = 'test@example.com' AND status = 'active'`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_users_email_status_e70e78c3" ON "users" ("email", "status") WHERE email = 'test@example.com' AND status = 'active'`,
		},
		// postgres docs example
		{
			name: "PartialUnique_WhereWithPostgresDocsExample_1",
			index: &PartialUniqueIndex{
				TableName:   "access_log",
				ColumnNames: []ColumnName{"client_ip"},
				Where:       `NOT (client_ip > inet '192.168.100.0' AND client_ip < inet '192.168.100.255')`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_access_log_client_ip_5a596410" ON "access_log" ("client_ip") WHERE NOT (client_ip > inet '192.168.100.0' AND client_ip < inet '192.168.100.255')`,
		},
		// postgres docs example
		{
			name: "PartialUnique_WhereWithPostgresDocsExample_2",
			index: &PartialUniqueIndex{
				TableName:   "orders",
				ColumnNames: []ColumnName{"order_nr"},
				Where:       `billed is not true`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_orders_order_nr_6d31bb0e" ON "orders" ("order_nr") WHERE billed is not true`,
		},
		// sqlite docs example
		{
			name: "PartialUnique_WhereWithSqliteDocsExample_1",
			index: &PartialUniqueIndex{
				TableName:   "person",
				ColumnNames: []ColumnName{"team_id"},
				Where:       `is_team_leader`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_person_team_id_c8604a29" ON "person" ("team_id") WHERE is_team_leader`,
		},
		// sqlite docs example
		{
			name: "PartialUnique_WhereWithSqliteDocsExample_2",
			index: &PartialUniqueIndex{
				TableName:   "purchaseorder",
				ColumnNames: []ColumnName{"parent_po"},
				Where:       `parent_po IS NOT NULL`,
			},
			sql: `CREATE UNIQUE INDEX IF NOT EXISTS "puq_purchaseorder_parent_po_dbe2929d" ON "purchaseorder" ("parent_po") WHERE parent_po IS NOT NULL`,
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
			name: "PartialUnique_NormalizedPostgresWhere",
			a: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `"deleted_at" IS NULL`,
			},
			b: &PartialUniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
				Where:       `(deleted_at IS NULL)`,
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
		{
			name: "Unique_Functional_Same",
			a: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			b: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			equals: true,
		},
		{
			name: "Unique_Functional_CaseInsensitiveEqual",
			a: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			b: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"lower(email)"},
			},
			equals: true,
		},
		{
			name: "Unique_Functional_QuotedSimpleIdentifierEqualsUnquoted",
			a: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			b: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{`LOWER("email")`},
			},
			equals: true,
		},
		{
			name: "Unique_Functional_UnquotedMixedCaseEqualsLower",
			a: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(Email)"},
			},
			b: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			equals: true,
		},
		{
			name: "Unique_Functional_QuotedMixedCaseNotEqualUnquoted",
			a: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{`LOWER("Email")`},
			},
			b: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			equals: false,
		},
		{
			name: "Unique_Functional_DifferentExpressions",
			a: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			b: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"UPPER(email)"},
			},
			equals: false,
		},
		{
			name: "Unique_Functional_NotEqualToPlainSameColumns",
			a: &UniqueIndexWithExpressions{
				TableName:   "users",
				Expressions: []string{"LOWER(email)"},
			},
			b: &UniqueIndex{
				TableName:   "users",
				ColumnNames: []ColumnName{"email"},
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

func TestUniqueIndexFunctionalName(t *testing.T) {
	t.Run("autogen uses uq_<table>_<hash>", func(t *testing.T) {
		idx := &UniqueIndexWithExpressions{
			TableName:   "tag",
			Expressions: []string{"org_id", "kind", "LOWER(key)", "LOWER(value)"},
		}
		assert.Equal(t, "uq_tag_a36c51df", idx.Name())
	})

	t.Run("same expressions produce the same name", func(t *testing.T) {
		a := &UniqueIndexWithExpressions{
			TableName:   "users",
			Expressions: []string{"LOWER(email)"},
		}
		b := &UniqueIndexWithExpressions{
			TableName:   "users",
			Expressions: []string{"LOWER(email)"},
		}
		assert.Equal(t, a.Name(), b.Name())
	})

	t.Run("different expressions produce different names", func(t *testing.T) {
		a := &UniqueIndexWithExpressions{
			TableName:   "users",
			Expressions: []string{"LOWER(email)"},
		}
		b := &UniqueIndexWithExpressions{
			TableName:   "users",
			Expressions: []string{"UPPER(email)"},
		}
		assert.NotEqual(t, a.Name(), b.Name())
	})

	t.Run("expressions in different order produce different names", func(t *testing.T) {
		a := &UniqueIndexWithExpressions{
			TableName:   "tag",
			Expressions: []string{"org_id", "LOWER(key)"},
		}
		b := &UniqueIndexWithExpressions{
			TableName:   "tag",
			Expressions: []string{"LOWER(key)", "org_id"},
		}
		assert.NotEqual(t, a.Name(), b.Name())
	})

	t.Run("functional autogen differs from plain autogen for same columns", func(t *testing.T) {
		plain := &UniqueIndex{
			TableName:   "users",
			ColumnNames: []ColumnName{"email"},
		}
		functional := &UniqueIndexWithExpressions{
			TableName:   "users",
			Expressions: []string{"LOWER(email)"},
		}
		assert.Equal(t, "uq_users_email", plain.Name())
		assert.NotEqual(t, plain.Name(), functional.Name())
	})

	t.Run("Named() override wins over hash", func(t *testing.T) {
		idx := (&UniqueIndexWithExpressions{
			TableName:   "tag",
			Expressions: []string{"org_id", "LOWER(key)"},
		}).Named("my_functional_index")
		assert.Equal(t, "my_functional_index", idx.Name())
	})
}

func TestNormalizeExpressions(t *testing.T) {
	testCases := []struct {
		name        string
		expressions []string
		output      []string
	}{
		{
			name:        "Empty",
			expressions: nil,
			output:      nil,
		},
		{
			name:        "PlainColumnsUnchanged",
			expressions: []string{"org_id", "kind"},
			output:      []string{"org_id", "kind"},
		},
		{
			name:        "FunctionNameCaseFolded",
			expressions: []string{"LOWER(key)", "LOWER(value)"},
			output:      []string{"lower(key)", "lower(value)"},
		},
		{
			name:        "PostgresRenderedMatchesDeclared",
			expressions: []string{"lower(key)"},
			output:      []string{"lower(key)"},
		},
		{
			name:        "WhitespaceCollapsedPerExpression",
			expressions: []string{"LOWER(  key )", "org_id"},
			output:      []string{"lower( key )", "org_id"},
		},
		{
			name:        "RedundantOuterParenthesesStripped",
			expressions: []string{"(LOWER(key))"},
			output:      []string{"lower(key)"},
		},
		{
			name:        "QuotedSimpleIdentifierUnquoted",
			expressions: []string{`LOWER("email")`},
			output:      []string{"lower(email)"},
		},
		{
			name:        "QuotedIdentifierCaseByIdentifierPreserved",
			expressions: []string{`LOWER("Key")`},
			output:      []string{`lower("Key")`},
		},
		{
			name:        "StringLiteralCasePreserved",
			expressions: []string{"COALESCE(status, 'Deleted')"},
			output:      []string{"coalesce(status, 'Deleted')"},
		},
		{
			name:        "NormalizedIndependentlyPerElement",
			expressions: []string{"UPPER(a)", "b", "LOWER(c)"},
			output:      []string{"upper(a)", "b", "lower(c)"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.output, normalizeExpressions(testCase.expressions))
		})
	}
}

func TestPartialUniqueIndexName(t *testing.T) {
	a := &PartialUniqueIndex{
		TableName:   "users",
		ColumnNames: []ColumnName{"email"},
		Where:       `"deleted_at" IS NULL`,
	}
	b := &PartialUniqueIndex{
		TableName:   "users",
		ColumnNames: []ColumnName{"email"},
		Where:       `(deleted_at IS NULL)`,
	}
	c := &PartialUniqueIndex{
		TableName:   "users",
		ColumnNames: []ColumnName{"email"},
		Where:       `"active" = true`,
	}

	assert.Equal(t, "puq_users_email_94610c77", a.Name())
	assert.Equal(t, a.Name(), b.Name())
	assert.NotEqual(t, a.Name(), c.Name())
}
