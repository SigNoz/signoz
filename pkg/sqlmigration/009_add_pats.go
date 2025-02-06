package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addPats struct{}

func NewAddPatsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_pats"), newAddPats)
}

func newAddPats(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addPats{}, nil
}

func (migration *addPats) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addPats) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model((*models.OrgDomain)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model((*models.PersonalAccessToken)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addPats) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
