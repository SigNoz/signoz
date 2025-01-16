package sqlstoremigrator

import (
	"context"
	"errors"
	"time"

	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.uber.org/zap"
)

var (
	migrationTableName     = "migration"
	migrationLockTableName = "migration_lock"
)

type migrator struct {
	migrator *migrate.Migrator
	sqlStore sqlstore.SQLStore
	settings factory.ScopedProviderSettings
	config   sqlstore.MigrationConfig
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, sqlstore sqlstore.SQLStore, migrations *migrate.Migrations, config sqlstore.Config) sqlstore.SQLStoreMigrator {
	return &migrator{
		sqlStore: sqlstore,
		migrator: migrate.NewMigrator(sqlstore.BunDB(), migrations, migrate.WithTableName(migrationTableName), migrate.WithLocksTableName(migrationLockTableName)),
		settings: factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/sqlstore/sqlstoremigrator"),
		config:   config.Migration,
	}
}

func (migrator *migrator) Migrate(ctx context.Context) error {
	migrator.settings.ZapLogger().Info("starting sqlstore migrations", zap.String("dialect", migrator.sqlStore.BunDB().Dialect().Name().String()))
	if err := migrator.migrator.Init(ctx); err != nil {
		return err
	}

	if err := migrator.Lock(ctx); err != nil {
		return err
	}

	defer migrator.migrator.Unlock(ctx) //nolint:errcheck

	group, err := migrator.migrator.Migrate(ctx)
	if err != nil {
		return err
	}

	if group.IsZero() {
		migrator.settings.ZapLogger().Info("no new migrations to run (database is up to date)", zap.String("dialect", migrator.sqlStore.BunDB().Dialect().Name().String()))
		return nil
	}

	migrator.settings.ZapLogger().Info("migrated to", zap.String("group", group.String()), zap.String("dialect", migrator.sqlStore.BunDB().Dialect().Name().String()))
	return nil
}

func (migrator *migrator) Rollback(ctx context.Context) error {
	if err := migrator.Lock(ctx); err != nil {
		return err
	}
	defer migrator.migrator.Unlock(ctx) //nolint:errcheck

	group, err := migrator.migrator.Rollback(ctx)
	if err != nil {
		return err
	}

	if group.IsZero() {
		migrator.settings.ZapLogger().Info("no groups to roll back", zap.String("dialect", migrator.sqlStore.BunDB().Dialect().Name().String()))
		return nil
	}

	migrator.settings.ZapLogger().Info("rolled back", zap.String("group", group.String()), zap.String("dialect", migrator.sqlStore.BunDB().Dialect().Name().String()))
	return nil
}

func (migrator *migrator) Lock(ctx context.Context) error {
	if err := migrator.migrator.Lock(ctx); err == nil {
		migrator.settings.ZapLogger().Info("acquired migration lock", zap.String("dialect", migrator.sqlStore.BunDB().Dialect().Name().String()))
		return nil
	}

	timer := time.NewTimer(migrator.config.LockTimeout)
	defer timer.Stop()

	ticker := time.NewTicker(migrator.config.LockInterval)
	defer ticker.Stop()

	for {
		select {
		case <-timer.C:
			err := errors.New("timed out waiting for lock")
			migrator.settings.ZapLogger().Error("cannot acquire lock", zap.Error(err), zap.Duration("lock_timeout", migrator.config.LockTimeout), zap.String("dialect", migrator.sqlStore.BunDB().Dialect().Name().String()))
			return err
		case <-ticker.C:
			if err := migrator.migrator.Lock(ctx); err == nil {
				migrator.settings.ZapLogger().Info("acquired migration lock", zap.String("dialect", migrator.sqlStore.BunDB().Dialect().Name().String()))
				return nil
			}
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}
