package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types"
)

type updateDashboard struct {
	store sqlstore.SQLStore
}

func NewUpdateDashboardFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_group"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateDashboard(ctx, ps, c, sqlstore)
	})
}

func newUpdateDashboard(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateDashboard{
		store: store,
	}, nil
}

func (migration *updateDashboard) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateDashboard) Up(ctx context.Context, db *bun.DB) error {

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// add org id to dashboards table
	if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "dashboards", "org_id"); err != nil {
		return err
	} else if !exists {
		if _, err := tx.NewAddColumn().Table("dashboards").ColumnExpr("org_id TEXT").Exec(ctx); err != nil {
			return err
		}

		// get all org ids
		var orgIDs []string
		if err := migration.store.BunDB().NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs); err != nil {
			return err
		}

		// check if there is one org ID if yes then set it to all dashboards.
		if len(orgIDs) == 1 {
			orgID := orgIDs[0]
			if _, err := tx.NewUpdate().Table("dashboards").Set("org_id = ?", orgID).Exec(ctx); err != nil {
				return err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updateDashboard) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
