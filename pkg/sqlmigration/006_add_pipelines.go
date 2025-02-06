package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addPipelines struct{}

func NewAddPipelinesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_pipelines"), newAddPipelines)
}

func newAddPipelines(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addPipelines{}, nil
}

func (migration *addPipelines) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addPipelines) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model((*models.Pipeline)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addPipelines) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
