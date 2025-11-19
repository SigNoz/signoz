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

type updateAuthz struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateAuthzFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_authz"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateAuthz(ctx, ps, c, sqlstore, sqlschema)
	})
}

func newUpdateAuthz(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &updateAuthz{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *updateAuthz) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateAuthz) Up(ctx context.Context, db *bun.DB) error {
	if migration.sqlstore.BunDB().Dialect().Name() != dialect.PG {
		return nil
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("tuple"))
	if err != nil {
		return err
	}
	dropTableSQLS := migration.sqlschema.Operator().DropTable(table)
	sqls = append(sqls, dropTableSQLS...)

	table, _, err = migration.sqlschema.GetTable(ctx, sqlschema.TableName("authorization_model"))
	if err != nil {
		return err
	}
	dropTableSQLS = migration.sqlschema.Operator().DropTable(table)
	sqls = append(sqls, dropTableSQLS...)

	table, _, err = migration.sqlschema.GetTable(ctx, sqlschema.TableName("changelog"))
	if err != nil {
		return err
	}
	dropTableSQLS = migration.sqlschema.Operator().DropTable(table)
	sqls = append(sqls, dropTableSQLS...)

	table, _, err = migration.sqlschema.GetTable(ctx, sqlschema.TableName("assertion"))
	if err != nil {
		return err
	}
	dropTableSQLS = migration.sqlschema.Operator().DropTable(table)
	sqls = append(sqls, dropTableSQLS...)

	tableSQLs := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "tuple",
		Columns: []*sqlschema.Column{
			{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "_user", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "condition_name", DataType: sqlschema.DataTypeBytea, Nullable: true},
			{Name: "condition_context", DataType: sqlschema.DataTypeText, Nullable: true},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "object_type", "object_id", "relation", "_user"}},
	})
	sqls = append(sqls, tableSQLs...)

	tableSQLs = migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "authorization_model",
		Columns: []*sqlschema.Column{
			{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "authorization_model_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "type_definition", DataType: sqlschema.DataTypeBytea, Nullable: true},
			{Name: "schema_version", DataType: sqlschema.DataTypeText, Nullable: false, Default: "1.1"},
			{Name: "serialized_protobuf", DataType: sqlschema.DataTypeBytea, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "authorization_model_id", "type"}},
	})
	sqls = append(sqls, tableSQLs...)

	tableSQLs = migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "changelog",
		Columns: []*sqlschema.Column{
			{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "_user", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "operation", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "condition_name", DataType: sqlschema.DataTypeBytea, Nullable: true},
			{Name: "condition_context", DataType: sqlschema.DataTypeText, Nullable: true},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "ulid", "object_type"}},
	})
	sqls = append(sqls, tableSQLs...)

	tableSQLs = migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "assertion",
		Columns: []*sqlschema.Column{
			{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "authorization_model_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "assertions", DataType: sqlschema.DataTypeBytea, Nullable: true},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "authorization_model_id"}},
	})
	sqls = append(sqls, tableSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateAuthz) Down(context.Context, *bun.DB) error {
	return nil
}
