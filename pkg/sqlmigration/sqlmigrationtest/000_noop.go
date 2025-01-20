package sqlmigrationtest

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlmigration"
)

type noopMigration struct{}

func NoopMigrationFactory() factory.ProviderFactory[sqlmigration.SQLMigration, sqlmigration.Config] {
	return factory.NewProviderFactory(factory.MustNewName("noop"), func(_ context.Context, _ factory.ProviderSettings, _ sqlmigration.Config) (sqlmigration.SQLMigration, error) {
		return &noopMigration{}, nil
	})
}

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
