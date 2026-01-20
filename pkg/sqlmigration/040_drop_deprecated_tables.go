package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type dropDeprecatedTables struct{}

func NewDropDeprecatedTablesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("drop_deprecated_tables"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newDropDeprecatedTables(ctx, ps, c)
	})
}

func newDropDeprecatedTables(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &dropDeprecatedTables{}, nil
}

func (migration *dropDeprecatedTables) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *dropDeprecatedTables) Up(ctx context.Context, db *bun.DB) error {
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
		Table("rule_history").
		Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.
		NewDropTable().
		IfExists().
		Table("data_migrations").
		Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *dropDeprecatedTables) Down(context.Context, *bun.DB) error {
	return nil
}
