package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
)

type fixChangelogOperationType struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewFixChangelogOperationTypeFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("fix_changelog_operation_type"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &fixChangelogOperationType{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *fixChangelogOperationType) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *fixChangelogOperationType) Up(ctx context.Context, db *bun.DB) error {
	// Fix OpenFGA table column types to match the expected schema.
	//
	// Migration 054 introduced two bugs for PostgreSQL:
	//   1. changelog.operation is TEXT, should be INTEGER (OpenFGA v1.14.0 passes int32)
	//   2. condition_name and condition_context types are swapped in both
	//      tuple and changelog tables (BYTEA <-> TEXT)
	//
	// Changelog: drop and recreate (it is only used by OpenFGA's ReadChanges
	// API which SigNoz does not call; authorization data lives in tuple).
	// Tuple: alter columns in place (condition columns are always NULL since
	// SigNoz does not use FGA conditions).

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	// 1. Drop and recreate changelog with correct types.
	changelogTable, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("changelog"))
	if err != nil {
		return err
	}

	dropTableSQLs := migration.sqlschema.Operator().DropTable(changelogTable)
	sqls = append(sqls, dropTableSQLs...)

	if migration.sqlstore.BunDB().Dialect().Name() == dialect.PG {
		createTableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
			Name: "changelog",
			Columns: []*sqlschema.Column{
				{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "_user", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "condition_name", DataType: sqlschema.DataTypeText, Nullable: true},
				{Name: "condition_context", DataType: sqlschema.DataTypeBytea, Nullable: true},
				{Name: "operation", DataType: sqlschema.DataTypeInteger, Nullable: false},
				{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "ulid", "object_type"}},
		})
		sqls = append(sqls, createTableSQLs...)
	} else {
		createTableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
			Name: "changelog",
			Columns: []*sqlschema.Column{
				{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "user_object_type", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "user_object_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "user_relation", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "condition_name", DataType: sqlschema.DataTypeText, Nullable: true},
				{Name: "condition_context", DataType: sqlschema.DataTypeBytea, Nullable: true},
				{Name: "operation", DataType: sqlschema.DataTypeInteger, Nullable: false},
				{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "ulid", "object_type"}},
		})
		sqls = append(sqls, createTableSQLs...)
	}

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *fixChangelogOperationType) Down(_ context.Context, _ *bun.DB) error {
	return nil
}
