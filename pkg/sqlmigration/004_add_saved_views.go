package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
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
	if _, err := db.NewCreateTable().
		Model((*models.SavedView)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addSavedViews) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
