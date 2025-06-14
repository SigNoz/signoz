package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type dropLicensesSites struct {
	store sqlstore.SQLStore
}

func NewDropLicensesSitesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("drop_licenses_sites"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newDropLicensesSites(ctx, ps, c, sqlstore)
	})
}

func newDropLicensesSites(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &dropLicensesSites{store: store}, nil
}

func (migration *dropLicensesSites) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *dropLicensesSites) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.
		NewDropTable().
		IfExists().
		Table("sites").
		Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.
		NewDropTable().
		IfExists().
		Table("licenses").
		Exec(ctx); err != nil {
		return err
	}

	_, err = migration.
		store.
		Dialect().
		RenameColumn(ctx, tx, "saved_views", "uuid", "id")
	if err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *dropLicensesSites) Down(context.Context, *bun.DB) error {
	return nil
}
