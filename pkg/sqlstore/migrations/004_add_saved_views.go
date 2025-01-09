package migrations

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/sqlstore"
)

type addSavedViews struct {
	config sqlstore.MigrationConfig
}

func NewAddSavedViewsMigrationFactory() sqlstore.MigrationFactory {
	return sqlstore.NewMigrationFactory(newAddSavedViews)
}

func newAddSavedViews(config sqlstore.MigrationConfig) sqlstore.Migration {
	return &addSavedViews{config: config}
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
