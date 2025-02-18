package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type modifyOrgDomain struct{}

func NewModifyOrgDomainFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("modify_org_domain"), newModifyOrgDomain)
}

func newModifyOrgDomain(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &modifyOrgDomain{}, nil
}

func (migration *modifyOrgDomain) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *modifyOrgDomain) Up(ctx context.Context, db *bun.DB) error {
	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// rename old column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE org_domains RENAME COLUMN updated_at TO updated_at_old`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `ALTER TABLE org_domains ADD COLUMN updated_at INTEGER`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `UPDATE org_domains SET updated_at = CAST(updated_at_old AS INTEGER)`); err != nil {
		return err
	}

	// drop the old column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE org_domains DROP COLUMN updated_at_old`); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *modifyOrgDomain) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
