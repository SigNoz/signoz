package sqlmigration

import (
	"context"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateTTLSettingForCustomRetention struct {
	sqlstore sqlstore.SQLStore
}

func NewUpdateTTLSettingForCustomRetentionFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_ttl_setting"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newUpdateTTLSettingForCustomRetention(ctx, providerSettings, config, sqlstore)
	})
}

func newUpdateTTLSettingForCustomRetention(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore) (SQLMigration, error) {
	return &updateTTLSettingForCustomRetention{sqlstore: sqlstore}, nil
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

	// Add only the resource_rules column to ttl_setting table
	_, err = tx.Exec("ALTER TABLE ttl_setting ADD COLUMN resource_rules TEXT")
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateTTLSettingForCustomRetention) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
