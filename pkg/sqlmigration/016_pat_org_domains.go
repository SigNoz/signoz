package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
)

type updatePatAndOrgDomains struct {
	store sqlstore.SQLStore
}

func NewUpdatePatAndOrgDomainsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_pat_and_org_domains"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdatePatAndOrgDomains(ctx, ps, c, sqlstore)
	})
}

func newUpdatePatAndOrgDomains(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updatePatAndOrgDomains{
		store: store,
	}, nil
}

func (migration *updatePatAndOrgDomains) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updatePatAndOrgDomains) Up(ctx context.Context, db *bun.DB) error {

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// add org id to pat and org_domains table
	for _, table := range []string{"personal_access_tokens", "org_domains"} {
		if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, table, "org_id"); err != nil {
			return err
		} else if !exists {
			if _, err := tx.NewAddColumn().Table(table).ColumnExpr("org_id TEXT").Exec(ctx); err != nil {
				return err
			}
		}
	}

	// change created_at and updated_at from integer to timestamp
	for _, table := range []string{"personal_access_tokens", "org_domains"} {
		if err := migration.store.Dialect().MigrateIntToTimestamp(ctx, tx, table, "created_at"); err != nil {
			return err
		}
		if err := migration.store.Dialect().MigrateIntToTimestamp(ctx, tx, table, "updated_at"); err != nil {
			return err
		}
	}

	// drop table if exists ingestion_keys
	if _, err := tx.NewDropTable().IfExists().Table("ingestion_keys").Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updatePatAndOrgDomains) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
