package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updatePat struct {
	store sqlstore.SQLStore
}

func NewUpdatePatFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_pat"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdatePat(ctx, ps, c, sqlstore)
	})
}

func newUpdatePat(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updatePat{store: store}, nil
}

func (migration *updatePat) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updatePat) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	for _, column := range []string{"last_used", "expires_at"} {
		if err := migration.
			store.
			Dialect().
			AddNotNullDefaultToColumn(ctx, tx, "personal_access_tokens", column, "INTEGER", "0"); err != nil {
			return err
		}
	}

	if err := migration.
		store.
		Dialect().
		AddNotNullDefaultToColumn(ctx, tx, "personal_access_tokens", "revoked", "BOOLEAN", "false"); err != nil {
		return err
	}

	if err := migration.
		store.
		Dialect().
		AddNotNullDefaultToColumn(ctx, tx, "personal_access_tokens", "updated_by_user_id", "TEXT", "''"); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updatePat) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
