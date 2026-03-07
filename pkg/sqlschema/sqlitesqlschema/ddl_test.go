package sqlitesqlschema

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func TestParseCreateTable(t *testing.T) {
	testCases := []struct {
		name              string
		sql               string
		table             *sqlschema.Table
		uniqueConstraints []*sqlschema.UniqueConstraint
		err               error
	}{
		{
			name: "NewlineAndTabBeforeComma_NoQuotesInColumnNames_InlineConstraints_References",
			sql: `CREATE TABLE test (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL,
			data TEXT
		, created_at TIMESTAMP, updated_at TIMESTAMP, org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE)`,
			table: &sqlschema.Table{
				Name: "test",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "email", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "data", DataType: sqlschema.DataTypeText, Nullable: true},
					{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
					{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
					{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
				ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "organizations", ReferencedColumnName: "id"},
				},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{},
			err:               nil,
		},
		{
			name: "SingleLine_QuotesInColumnNames_SeparateConstraints_PrimaryAndForeign",
			sql:  `CREATE TABLE "test" ("id" TEXT NOT NULL, "display_name" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_users" PRIMARY KEY ("id"), CONSTRAINT "fk_users_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
			table: &sqlschema.Table{
				Name: "test",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "display_name", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
				ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "organizations", ReferencedColumnName: "id"},
				},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{},
			err:               nil,
		},
		{
			name: "SingleLine_QuotesInColumnNames_InlineConstraints_UniqueAndForeign",
			sql:  `CREATE TABLE "test" ("id" text NOT NULL, "created_at" TIMESTAMP, "org_id" text NOT NULL, PRIMARY KEY ("id"), UNIQUE ("org_id"), FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
			table: &sqlschema.Table{
				Name: "test",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
					{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
				ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "organizations", ReferencedColumnName: "id"},
				},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{
				{ColumnNames: []sqlschema.ColumnName{"org_id"}},
			},
			err: nil,
		},
		{
			name: "SingleLine_NoQuotes_InlineConstraints_2ColumnsInUnique",
			sql:  `CREATE TABLE "test" ("id" text NOT NULL, "signal" TEXT NOT NULL, "org_id" text NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "org_id_signal" UNIQUE ("org_id", "signal"))`,
			table: &sqlschema.Table{
				Name: "test",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "signal", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{
				{ColumnNames: []sqlschema.ColumnName{"org_id", "signal"}},
			},
			err: nil,
		},
		{
			name: "Tabbed_BacktickQuotes_Constraints_PrimaryAndUnique",
			sql:  "CREATE TABLE `test`       (id    integer   primary key unique,     dark_mode    numeric DEFAULT true)",
			table: &sqlschema.Table{
				Name: "test",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeInteger, Nullable: false},
					{Name: "dark_mode", DataType: sqlschema.DataTypeNumeric, Nullable: true, Default: "true"},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{},
			err:               nil,
		},
		{
			name: "SingleLine_BacktickQuotesInteger_NoConstraints",
			sql:  "CREATE TABLE `test-hyphen` (`field` integer NOT NULL)",
			table: &sqlschema.Table{
				Name: "test-hyphen",
				Columns: []*sqlschema.Column{
					{Name: "field", DataType: sqlschema.DataTypeInteger, Nullable: false},
				},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{},
			err:               nil,
		},
		{
			name: "SingleLine_BacktickQuotesNumeric_NoConstraints",
			sql:  "CREATE TABLE `test-hyphen` (`field` real NOT NULL)",
			table: &sqlschema.Table{
				Name: "test-hyphen",
				Columns: []*sqlschema.Column{
					{Name: "field", DataType: sqlschema.DataTypeNumeric, Nullable: false},
				},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{},
			err:               nil,
		},
		{
			name: "SingleLine_QuotesAndDefaultInColumnNames_2Constraints_UniqueAndForeign",
			sql:  `CREATE TABLE "test" ("id" text NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "status" text NOT NULL DEFAULT 'notstarted', "org_id" text NOT NULL, PRIMARY KEY ("id"), CONSTRAINT "idx" UNIQUE ("org_id", "status", "created_at"), FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
			table: &sqlschema.Table{
				Name: "test",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
					{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
					{Name: "status", DataType: sqlschema.DataTypeText, Nullable: false, Default: "'notstarted'"},
					{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
				ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
					{ReferencingColumnName: "org_id", ReferencedTableName: "organizations", ReferencedColumnName: "id"},
				},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{
				{ColumnNames: []sqlschema.ColumnName{"org_id", "status", "created_at"}},
			},
			err: nil,
		},
		{
			name: "SingleLine_QuotesAndDefaultInColumnNames_NoConstraints",
			sql:  `CREATE TABLE "real_default" ("id" INTEGER NOT NULL, "r" REAL DEFAULT 1.0)`,
			table: &sqlschema.Table{
				Name: "real_default",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeInteger, Nullable: false},
					{Name: "r", DataType: sqlschema.DataTypeNumeric, Nullable: true, Default: "1.0"},
				},
			},
			uniqueConstraints: []*sqlschema.UniqueConstraint{},
			err:               nil,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			table, uniqueConstraints, err := parseCreateTable(testCase.sql, Formatter{sqlschema.NewFormatter(sqlitedialect.New())})
			if testCase.err != nil {
				assert.Equal(t, testCase.err, err)
				return
			}

			assert.Equal(t, testCase.table.Name, table.Name)
			assert.ElementsMatch(t, testCase.table.Columns, table.Columns)
			assert.Equal(t, testCase.table.PrimaryKeyConstraint, table.PrimaryKeyConstraint)
			assert.ElementsMatch(t, testCase.table.ForeignKeyConstraints, table.ForeignKeyConstraints)
			assert.ElementsMatch(t, testCase.uniqueConstraints, uniqueConstraints)
		})
	}
}
