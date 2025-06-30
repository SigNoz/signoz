package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addIndexes struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddIndexesFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_indexes"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddIndexes(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddIndexes(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addIndexes{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addIndexes) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addIndexes) Up(ctx context.Context, db *bun.DB) error {
	if err := migration.sqlstore.Dialect().ToggleForeignKeyConstraint(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	indexSQLs := [][]byte{}
	indexSQLs = append(indexSQLs, migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "factor_password", ColumnNames: []string{"user_id"}})...)
	indexSQLs = append(indexSQLs, migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "reset_password_token", ColumnNames: []string{"password_id"}})...)
	indexSQLs = append(indexSQLs, migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "reset_password_token", ColumnNames: []string{"token"}})...)
	indexSQLs = append(indexSQLs, migration.sqlschema.CreateIndex(ctx, &sqlschema.UniqueIndex{TableName: "license", ColumnNames: []string{"org_id"}})...)

	for _, sql := range indexSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if err := migration.sqlstore.Dialect().ToggleForeignKeyConstraint(ctx, db, true); err != nil {
		return err
	}

	return nil
}

func (migration *addIndexes) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
