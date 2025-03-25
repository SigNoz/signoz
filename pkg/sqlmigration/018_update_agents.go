package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateAgents struct {
	store sqlstore.SQLStore
}

func NewUpdateAgentsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_agents"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateAgents(ctx, ps, c, sqlstore)
	})
}

func newUpdateAgents(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateAgents{
		store: store,
	}, nil
}

func (migration *updateAgents) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateAgents) Up(ctx context.Context, db *bun.DB) error {

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// get all org ids
	var orgIDs []string
	if err := migration.store.BunDB().NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs); err != nil {
		return err
	}

	// add org id to dashboards table
	for _, table := range []string{"agents", "agent_config_versions", "agent_config_elements"} {
		if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, table, "org_id"); err != nil {
			return err
		} else if !exists {
			if _, err := tx.NewAddColumn().Table(table).ColumnExpr("org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE").Exec(ctx); err != nil {
				return err
			}

			// check if there is one org ID if yes then set it to all dashboards.
			if len(orgIDs) == 1 {
				orgID := orgIDs[0]
				if _, err := tx.NewUpdate().Table(table).Set("org_id = ?", orgID).Where("org_id IS NULL").Exec(ctx); err != nil {
					return err
				}
			}
		}
	}

	// add unique constraint to agents table of org_id and agent_id
	if _, err := tx.NewCreateIndex().Table("agents").Index("idx_agents_org_id_agent_id").Column("org_id", "agent_id").Unique().Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updateAgents) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
