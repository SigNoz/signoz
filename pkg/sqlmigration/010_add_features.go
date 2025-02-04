package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addFeatures struct{}

func NewAddFeatureFlagFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_feature_flag"), newAddFeatureFlag)
}

func newAddFeatureFlag(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addFeatures{}, nil
}

func (migration *addFeatures) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addFeatures) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS feature_flag(
		org_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		stage TEXT,
		is_active BOOLEAN DEFAULT FALSE,
		is_changed BOOLEAN DEFAULT FALSE,
		is_changeable BOOLEAN DEFAULT TRUE,
		requires_restart BOOLEAN DEFAULT FALSE,
		UNIQUE(org_id, name),
		FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
	);`); err != nil {
		return err
	}
	return nil
}

func (migration *addFeatures) Down(ctx context.Context, db *bun.DB) error {
	if _, err := db.ExecContext(ctx, `DROP TABLE IF EXISTS feature_flag`); err != nil {
		return err
	}
	return nil
}
