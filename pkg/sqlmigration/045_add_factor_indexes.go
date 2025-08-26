package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addFactorIndexes struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddFactorIndexesFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_factor_indexes"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddFactorIndexes(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddFactorIndexes(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addFactorIndexes{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addFactorIndexes) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addFactorIndexes) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}

	indexSQLs := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "factor_password", ColumnNames: []sqlschema.ColumnName{"user_id"}})
	sqls = append(sqls, indexSQLs...)

	indexSQLs = migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "reset_password_token", ColumnNames: []sqlschema.ColumnName{"password_id"}})
	sqls = append(sqls, indexSQLs...)

	indexSQLs = migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{TableName: "reset_password_token", ColumnNames: []sqlschema.ColumnName{"token"}})
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

func (migration *addFactorIndexes) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
