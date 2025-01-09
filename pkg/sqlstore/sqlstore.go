package sqlstore

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/zap"
)

type SqlStore interface {
	Provider() Provider
	Migrate(context.Context) error
	Rollback(context.Context) error
}

type ProviderConfig struct {
	Logger *zap.Logger
}

type Provider interface {
	SqlDB() *sql.DB
	BunDB() *bun.DB
	SqlxDB() *sqlx.DB
}

type sqlStore struct {
	provider Provider
	migrator *migrate.Migrator
}

func NewSqlStore(provider Provider, migrations *migrate.Migrations) *sqlStore {
	migrator := migrate.NewMigrator(provider.BunDB(), migrations, migrate.WithMarkAppliedOnSuccess(true))

	return &sqlStore{
		provider: provider,
		migrator: migrator,
	}
}

func (sqlstore *sqlStore) Migrate(ctx context.Context) error {
	if err := sqlstore.migrator.Init(ctx); err != nil {
		return err
	}

	if err := sqlstore.migrator.Lock(ctx); err != nil {
		return err
	}

	defer sqlstore.migrator.Unlock(ctx) //nolint:errcheck

	group, err := sqlstore.migrator.Migrate(ctx)
	if err != nil {
		return err
	}

	if group.IsZero() {
		fmt.Printf("there are no new migrations to run (database is up to date)\n")
		return nil
	}

	fmt.Printf("migrated to %s\n", group)
	return nil
}

func (sqlstore *sqlStore) Rollback(ctx context.Context) error {
	if err := sqlstore.migrator.Lock(ctx); err != nil {
		return err
	}
	defer sqlstore.migrator.Unlock(ctx) //nolint:errcheck

	group, err := sqlstore.migrator.Rollback(ctx)
	if err != nil {
		return err
	}

	if group.IsZero() {
		fmt.Printf("there are no groups to roll back\n")
		return nil
	}

	fmt.Printf("rolled back %s\n", group)
	return nil
}

func (sqlstore *sqlStore) Provider() Provider {
	return sqlstore.provider
}
