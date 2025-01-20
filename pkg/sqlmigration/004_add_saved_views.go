package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addSavedViews struct{}

func NewAddSavedViewsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_saved_views"), newAddSavedViews)
}

func newAddSavedViews(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addSavedViews{}, nil
}

func (migration *addSavedViews) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addSavedViews) Up(ctx context.Context, db *bun.DB) error {
	// table:saved_views op:create
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS saved_views (
		uuid TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		category TEXT NOT NULL,
		created_at datetime NOT NULL,
		created_by TEXT,
		updated_at datetime NOT NULL,
		updated_by TEXT,
		source_page TEXT NOT NULL,
		tags TEXT,
		data TEXT NOT NULL,
		extra_data TEXT
	);`); err != nil {
		return err
	}

	return nil
}

func (migration *addSavedViews) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
