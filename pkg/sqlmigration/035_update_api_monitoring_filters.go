package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/quickfiltertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateApiMonitoringFilters struct {
	store sqlstore.SQLStore
}

func NewUpdateApiMonitoringFiltersFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_api_monitoring_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateApiMonitoringFilters(ctx, ps, c, store)
	})
}

func newUpdateApiMonitoringFilters(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateApiMonitoringFilters{
		store: store,
	}, nil
}

func (migration *updateApiMonitoringFilters) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateApiMonitoringFilters) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Get all organization IDs as strings
	var orgIDs []string
	err = tx.NewSelect().
		Table("organizations").
		Column("id").
		Scan(ctx, &orgIDs)
	if err != nil {
		if err == sql.ErrNoRows {
			if err := tx.Commit(); err != nil {
				return err
			}
			return nil
		}
		return err
	}

	for _, orgID := range orgIDs {
		// Get the updated default quick filters which includes the new API monitoring filters
		storableQuickFilters, err := quickfiltertypes.NewDefaultQuickFilter(valuer.MustNewUUID(orgID))
		if err != nil {
			return err
		}

		// Find the API monitoring filter from the storable quick filters
		var apiMonitoringFilterJSON string
		for _, filter := range storableQuickFilters {
			if filter.Signal == quickfiltertypes.SignalApiMonitoring {
				apiMonitoringFilterJSON = filter.Filter
				break
			}
		}

		if apiMonitoringFilterJSON != "" {
			_, err = tx.NewUpdate().
				Table("quick_filter").
				Set("filter = ?, updated_at = ?", apiMonitoringFilterJSON, time.Now()).
				Where("signal = ? AND org_id = ?", quickfiltertypes.SignalApiMonitoring, orgID).
				Exec(ctx)

			if err != nil {
				return err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	return nil
}

func (migration *updateApiMonitoringFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
