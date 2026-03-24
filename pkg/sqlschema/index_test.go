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
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.equals, testCase.a.Equals(testCase.b))
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
