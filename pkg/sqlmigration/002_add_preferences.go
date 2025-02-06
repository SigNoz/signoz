package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addPreferences struct{}

func NewAddPreferencesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_preferences"), newAddPreferences)
}

func newAddPreferences(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addPreferences{}, nil
}

func (migration *addPreferences) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addPreferences) Up(ctx context.Context, db *bun.DB) error {
	// table:user_preference
	if _, err := db.NewCreateTable().
		Model((*models.UserPreference)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:org_preference
	if _, err := db.NewCreateTable().
		Model((*models.OrgPreference)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addPreferences) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
