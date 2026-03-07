package sqlmigrator

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun/migrate"
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
		migrator: migrate.NewMigrator(
			sqlstore.BunDB(),
			migrations,
			migrate.WithTableName(migrationTableName),
			migrate.WithLocksTableName(migrationLockTableName),
			// This is to ensure that the migration is marked as applied only on success. If the migration fails, no entry is made in the migration table
			// and the migration will be retried.
			migrate.WithMarkAppliedOnSuccess(true),
		),
		settings: factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlmigrator"),
		config:   config,
		dialect:  sqlstore.BunDB().Dialect().Name().String(),
	}
}

func (migrator *migrator) Migrate(ctx context.Context) error {
	migrator.settings.Logger().InfoContext(ctx, "starting sqlstore migrations", "dialect", migrator.dialect)
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
		migrator.settings.Logger().InfoContext(ctx, "no new migrations to run (database is up to date)", "dialect", migrator.dialect)
		return nil
	}

	migrator.settings.Logger().InfoContext(ctx, "migrated to", "group", group.String(), "dialect", migrator.dialect)
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
		migrator.settings.Logger().InfoContext(ctx, "no groups to roll back", "dialect", migrator.dialect)
		return nil
	}

	migrator.settings.Logger().InfoContext(ctx, "rolled back", "group", group.String(), "dialect", migrator.dialect)
	return nil
}

func (migrator *migrator) Lock(ctx context.Context) error {
	if err := migrator.migrator.Lock(ctx); err == nil {
		migrator.settings.Logger().InfoContext(ctx, "acquired migration lock", "dialect", migrator.dialect)
		return nil
	}

	timer := time.NewTimer(migrator.config.Lock.Timeout)
	defer timer.Stop()

	ticker := time.NewTicker(migrator.config.Lock.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-timer.C:
			err := errors.New(errors.TypeTimeout, errors.CodeTimeout, "timed out waiting for lock")
			migrator.settings.Logger().ErrorContext(ctx, "cannot acquire lock", "error", err, "lock_timeout", migrator.config.Lock.Timeout.String(), "dialect", migrator.dialect)
			return err
		case <-ticker.C:
			var err error
			if err = migrator.migrator.Lock(ctx); err == nil {
				migrator.settings.Logger().InfoContext(ctx, "acquired migration lock", "dialect", migrator.dialect)
				return nil
			}
			migrator.settings.Logger().ErrorContext(ctx, "attempt to acquire lock failed", "error", err, "lock_interval", migrator.config.Lock.Interval.String(), "dialect", migrator.dialect)
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}
