package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updatePipelines struct {
	store sqlstore.SQLStore
}

func NewUpdatePipelines(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_pipelines"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdatePipelines(ctx, ps, c, sqlstore)
	})
}

func newUpdatePipelines(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updatePipelines{
		store: store,
	}, nil
}

func (migration *updatePipelines) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updatePipelines) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// get all org ids
	var orgIDs []string
	if err := migration.store.BunDB().NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs); err != nil {
		return err
	}

	// add org id to pipelines table
	if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "pipelines", "org_id"); err != nil {
		return err
	} else if !exists {
		if _, err := tx.NewAddColumn().Table("pipelines").ColumnExpr("org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE").Exec(ctx); err != nil {
			return err
		}

		// check if there is one org ID if yes then set it to all pipelines.
		if len(orgIDs) == 1 {
			orgID := orgIDs[0]
			if _, err := tx.NewUpdate().Table("pipelines").Set("org_id = ?", orgID).Where("org_id IS NULL").Exec(ctx); err != nil {
				return err
			}
		}
	}

	// add updated_by to pipelines table
	if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "pipelines", "updated_by"); err != nil {
		return err
	} else if !exists {
		if _, err := tx.NewAddColumn().Table("pipelines").ColumnExpr("updated_by TEXT").Exec(ctx); err != nil {
			return err
		}
	}

	// add updated_at to pipelines table
	if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "pipelines", "updated_at"); err != nil {
		return err
	} else if !exists {
		if _, err := tx.NewAddColumn().Table("pipelines").ColumnExpr("updated_at TIMESTAMP").Exec(ctx); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updatePipelines) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
