package migrationstest

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
)

func NoopMigrationFactory() factory.ProviderFactory[sqlstore.SQLStoreMigration, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), newNoopMigration)
}

func newNoopMigration(_ context.Context, _ factory.ProviderSettings, _ sqlstore.Config) (sqlstore.SQLStoreMigration, error) {
	return &noopMigration{}, nil
}

type noopMigration struct{}

func (migration *noopMigration) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *noopMigration) Up(ctx context.Context, db *bun.DB) error {
	return nil
}

func (migration *noopMigration) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
