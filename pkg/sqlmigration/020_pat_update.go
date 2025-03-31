package sqlmigration

import (
	"context"
	"fmt"

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
	return &updatePat{
		store: store,
	}, nil
}

func (migration *updatePat) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updatePat) Up(ctx context.Context, db *bun.DB) error {

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, column := range []string{"last_used", "expires_at"} {
		if err := migration.addNotNullDefaultToColumn(ctx, tx, "personal_access_tokens", column, "INTEGER", "0"); err != nil {
			return err
		}
	}

	if err := migration.addNotNullDefaultToColumn(ctx, tx, "personal_access_tokens", "revoked", "BOOLEAN", "false"); err != nil {
		return err
	}

	if err := migration.addNotNullDefaultToColumn(ctx, tx, "personal_access_tokens", "updated_by_user_id", "TEXT", "''"); err != nil {
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

func (migration *updatePat) addNotNullDefaultToColumn(ctx context.Context, tx bun.Tx, table string, column, columnType, defaultValue string) error {
	if _, err := tx.NewAddColumn().Table(table).ColumnExpr(fmt.Sprintf("%s_new %s NOT NULL DEFAULT %s ", column, columnType, defaultValue)).Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.NewUpdate().Table(table).Set(fmt.Sprintf("%s_new = %s", column, column)).Where("1=1").Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.NewDropColumn().Table(table).ColumnExpr(column).Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s_new TO %s", table, column, column)); err != nil {
		return err
	}

	return nil
}
