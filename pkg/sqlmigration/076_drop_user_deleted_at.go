package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type dropUserDeletedAt struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewDropUserDeletedAtFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("drop_user_deleted_at"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &dropUserDeletedAt{sqlstore: sqlstore, sqlschema: sqlschema}, nil
	})
}

func (migration *dropUserDeletedAt) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *dropUserDeletedAt) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("users"))
	if err != nil {
		return err
	}

	deletedAtColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("deleted_at"),
		DataType: sqlschema.DataTypeTimestamp,
		Nullable: false,
	}

	sqls := [][]byte{}

	dropIndexSQLs := migration.sqlschema.Operator().DropIndex(&sqlschema.UniqueIndex{TableName: "users", ColumnNames: []sqlschema.ColumnName{"org_id", "email", "deleted_at"}})
	sqls = append(sqls, dropIndexSQLs...)

	dropSQLs := migration.sqlschema.Operator().DropColumn(table, deletedAtColumn)
	sqls = append(sqls, dropSQLs...)

	indexSQLs := migration.sqlschema.Operator().CreateIndex(
		&sqlschema.PartialUniqueIndex{
			TableName:   "users",
			ColumnNames: []sqlschema.ColumnName{"email", "org_id"},
			Where:       "status != 'deleted'",
		})
	sqls = append(sqls, indexSQLs...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *dropUserDeletedAt) Down(context.Context, *bun.DB) error {
	return nil
}
