package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type removeOrganizationTuples struct {
	sqlstore sqlstore.SQLStore
}

func NewRemoveOrganizationTuplesFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("remove_organization_tuples"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &removeOrganizationTuples{sqlstore: sqlstore}, nil
	})
}

func (migration *removeOrganizationTuples) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *removeOrganizationTuples) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var storeID string
	err = tx.QueryRowContext(ctx, `SELECT id FROM store WHERE name = ? LIMIT 1`, "signoz").Scan(&storeID)
	if err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM tuple WHERE store = ? AND object_type = ?`, storeID, "organization"); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM changelog WHERE store = ? AND object_type = ?`, storeID, "organization"); err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *removeOrganizationTuples) Down(context.Context, *bun.DB) error {
	return nil
}
