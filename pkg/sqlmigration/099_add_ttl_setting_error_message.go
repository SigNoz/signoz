package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addTTLSettingErrorMessage struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddTTLSettingErrorMessageFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_ttl_setting_error_message"), func(ctx context.Context, ps factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddTTLSettingErrorMessage(ctx, ps, config, sqlstore, sqlschema)
	})
}

func newAddTTLSettingErrorMessage(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addTTLSettingErrorMessage{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addTTLSettingErrorMessage) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addTTLSettingErrorMessage) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("ttl_setting"))
	if err != nil {
		return err
	}

	column := &sqlschema.Column{
		Name:     sqlschema.ColumnName("error_message"),
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

func (migration *addTTLSettingErrorMessage) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
