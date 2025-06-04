package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type dropFeatureSet struct{}

func NewDropFeatureSetFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("drop_feature_set"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newDropFeatureSet(ctx, ps, c)
	})
}

func newDropFeatureSet(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &dropFeatureSet{}, nil
}

func (migration *dropFeatureSet) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *dropFeatureSet) Up(ctx context.Context, db *bun.DB) error {
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
		Table("feature_status").
		Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *dropFeatureSet) Down(context.Context, *bun.DB) error {
	return nil
}
