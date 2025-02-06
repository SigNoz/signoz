package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addDataMigrations struct{}

func NewAddDataMigrationsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_data_migrations"), newAddDataMigrations)
}

func newAddDataMigrations(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addDataMigrations{}, nil
}

func (migration *addDataMigrations) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addDataMigrations) Up(ctx context.Context, db *bun.DB) error {
	// table:data_migrations
	if _, err := db.NewCreateTable().
		Model((*models.DataMigration)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addDataMigrations) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
