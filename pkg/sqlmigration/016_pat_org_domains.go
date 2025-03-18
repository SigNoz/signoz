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
	for _, table := range []string{"personal_access_tokens"} {
		if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, table, "org_id"); err != nil {
			return err
		} else if !exists {
			if _, err := tx.NewAddColumn().Table(table).ColumnExpr("org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE").Exec(ctx); err != nil {
				return err
			}
		}
	}

	if err := updateOrgId(ctx, tx, "org_domains"); err != nil {
		return err
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

func updateOrgId(ctx context.Context, tx bun.Tx, table string) error {
	// create new column i.e org_id_old
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` ADD COLUMN org_id_old TEXT`); err != nil {
		return err
	}

	// copy data from old column to new column
	if _, err := tx.ExecContext(ctx, `UPDATE `+table+` SET org_id_old = org_id`); err != nil {
		return err
	}

	// drop old column and foreign key constraint
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` DROP COLUMN org_id`); err != nil {
		return err
	}

	// rename new column to org_id
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN org_id_old TO org_id`); err != nil {
		return err
	}

	// add foreign key constraint
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` ADD CONSTRAINT org_id_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE`); err != nil {
		return err
	}

	return nil
}
