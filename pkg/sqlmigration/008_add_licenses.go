package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addLicenses struct{}

func NewAddLicensesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_licenses"), newAddLicenses)
}

func newAddLicenses(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addLicenses{}, nil
}

func (migration *addLicenses) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addLicenses) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model((*models.License)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model((*models.Site)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model((*models.FeatureStatus)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model((*models.LicenseV3)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addLicenses) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
