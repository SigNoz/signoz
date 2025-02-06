package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addIntegrations struct{}

func NewAddIntegrationsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_integrations"), newAddIntegrations)
}

func newAddIntegrations(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addIntegrations{}, nil
}

func (migration *addIntegrations) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addIntegrations) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model((*models.Integration)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model((*models.CloudIntegrationAccount)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model((*models.CloudIntegrationServiceConfig)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addIntegrations) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
