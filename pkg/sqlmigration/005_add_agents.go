package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addAgents struct{}

func NewAddAgentsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_agents"), newAddAgents)
}

func newAddAgents(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addAgents{}, nil
}

func (migration *addAgents) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAgents) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model((*models.Agent)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model((*models.AgentConfigVersion)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model((*models.AgentConfigElement)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addAgents) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
