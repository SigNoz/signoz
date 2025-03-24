package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type schemaCleanup struct{}

func NewDropLicensesSitesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("drop-sites-licenses"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newDropLicensesSites(ctx, ps, c)
	})
}

func newDropLicensesSites(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &schemaCleanup{}, nil
}

func (migration *schemaCleanup) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *schemaCleanup) Down(context.Context, *bun.DB) error {
	return nil
}

func (migration *schemaCleanup) Up(ctx context.Context, db *bun.DB) error {
	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// drop the sites and licenses table
	if _, err := tx.NewDropTable().IfExists().Table("sites").Exec(ctx); err != nil {
		return err
	}
	if _, err := tx.NewDropTable().IfExists().Table("licenses").Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}
