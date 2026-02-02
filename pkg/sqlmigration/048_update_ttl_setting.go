package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateTTLSettingForCustomRetention struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateTTLSettingForCustomRetentionFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_ttl_setting"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newUpdateTTLSettingForCustomRetention(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newUpdateTTLSettingForCustomRetention(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &updateTTLSettingForCustomRetention{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *updateTTLSettingForCustomRetention) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *updateTTLSettingForCustomRetention) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Get the table and its constraints
	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("ttl_setting"))
	if err != nil {
		return err
	}

	// Define the new column
	column := &sqlschema.Column{
		Name:     sqlschema.ColumnName("condition"),
		DataType: sqlschema.DataTypeText,
		Nullable: true,
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, nil, column, nil)
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

func (migration *updateTTLSettingForCustomRetention) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
