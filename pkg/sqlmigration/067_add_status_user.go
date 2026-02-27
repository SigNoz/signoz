package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addStatusUser struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func AddStatusUserFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_status_user"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addStatusUser{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *addStatusUser) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addStatusUser) Up(ctx context.Context, db *bun.DB) error {
	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("users"))
	if err != nil {
		return err
	}

	column := &sqlschema.Column{
		Name:     sqlschema.ColumnName("status"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, column, false)

	indexSqls := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "users", ColumnNames: []sqlschema.ColumnName{"email", "org_id"}})

	sqls = append(sqls, indexSqls...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, true); err != nil {
		return err
	}

	return nil
}

func (migration *addStatusUser) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
