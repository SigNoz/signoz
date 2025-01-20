package sqlmigrator

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
	migrationTableName     string = "migration"
	migrationLockTableName string = "migration_lock"
)

type migrator struct {
	settings factory.ScopedProviderSettings
	config   Config
	migrator *migrate.Migrator
	dialect  string
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, sqlstore sqlstore.SQLStore, migrations *migrate.Migrations, config Config) SQLMigrator {
	return &migrator{
		migrator: migrate.NewMigrator(sqlstore.BunDB(), migrations, migrate.WithTableName(migrationTableName), migrate.WithLocksTableName(migrationLockTableName)),
		settings: factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/sqlmigrator"),
		config:   config,
		dialect:  sqlstore.BunDB().Dialect().Name().String(),
	}
}

func (migrator *migrator) Migrate(ctx context.Context) error {
	migrator.settings.ZapLogger().Info("starting sqlstore migrations", zap.String("dialect", migrator.dialect))
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
		migrator.settings.ZapLogger().Info("no new migrations to run (database is up to date)", zap.String("dialect", migrator.dialect))
		return nil
	}

	migrator.settings.ZapLogger().Info("migrated to", zap.String("group", group.String()), zap.String("dialect", migrator.dialect))
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
		migrator.settings.ZapLogger().Info("no groups to roll back", zap.String("dialect", migrator.dialect))
		return nil
	}

	migrator.settings.ZapLogger().Info("rolled back", zap.String("group", group.String()), zap.String("dialect", migrator.dialect))
	return nil
}

func (migrator *migrator) Lock(ctx context.Context) error {
	if err := migrator.migrator.Lock(ctx); err == nil {
		migrator.settings.ZapLogger().Info("acquired migration lock", zap.String("dialect", migrator.dialect))
		return nil
	}

	timer := time.NewTimer(migrator.config.Lock.Timeout)
	defer timer.Stop()

	ticker := time.NewTicker(migrator.config.Lock.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-timer.C:
			err := errors.New("timed out waiting for lock")
			migrator.settings.ZapLogger().Error("cannot acquire lock", zap.Error(err), zap.Duration("lock_timeout", migrator.config.Lock.Timeout), zap.String("dialect", migrator.dialect))
			return err
		case <-ticker.C:
			if err := migrator.migrator.Lock(ctx); err == nil {
				migrator.settings.ZapLogger().Info("acquired migration lock", zap.String("dialect", migrator.dialect))
				return nil
			}
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}
