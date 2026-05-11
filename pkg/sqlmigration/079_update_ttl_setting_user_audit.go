package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateTTLSettingUserAudit struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewUpdateTTLSettingUserAuditFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_ttl_setting_user_audit"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newUpdateTTLSettingUserAudit(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newUpdateTTLSettingUserAudit(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &updateTTLSettingUserAudit{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *updateTTLSettingUserAudit) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *updateTTLSettingUserAudit) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("ttl_setting"))
	if err != nil {
		return err
	}

	columns := []*sqlschema.Column{
		{
			Name:     sqlschema.ColumnName("created_by"),
			DataType: sqlschema.DataTypeText,
			Nullable: true,
		},
		{
			Name:     sqlschema.ColumnName("updated_by"),
			DataType: sqlschema.DataTypeText,
			Nullable: true,
		},
	}

	for _, column := range columns {
		sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, column, nil)
		for _, sql := range sqls {
			if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
				return err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updateTTLSettingUserAudit) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
