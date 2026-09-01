package sqlmigration

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateApiMonitoringFilters struct{}

func NewUpdateApiMonitoringFiltersFactory(store sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_api_monitoring_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateApiMonitoringFilters(ctx, ps, c, store)
	})
}

func newUpdateApiMonitoringFilters(_ context.Context, _ factory.ProviderSettings, _ Config, _ sqlstore.SQLStore) (SQLMigration, error) {
	return &updateApiMonitoringFilters{}, nil
}

func (migration *updateApiMonitoringFilters) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateApiMonitoringFilters) Up(ctx context.Context, db *bun.DB) error {
	// Frozen copy of the api_monitoring defaults as this migration shipped; the
	// change over 031 is service.name moving from "tag" to "resource".
	apiMonitoringFilters := []map[string]any{
		{"key": "deployment.environment", "dataType": "string", "type": "resource"},
		{"key": "service.name", "dataType": "string", "type": "resource"},
		{"key": "rpc.method", "dataType": "string", "type": "tag"},
	}

	apiMonitoringFilterJSON, err := json.Marshal(apiMonitoringFilters)
	if err != nil {
		return err
	}

	// The filter JSON is org-independent, so one update covers every org's row.
	_, err = db.NewUpdate().
		Table("quick_filter").
		Set("filter = ?, updated_at = ?", string(apiMonitoringFilterJSON), time.Now()).
		Where("signal = ?", "api_monitoring").
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateApiMonitoringFilters) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
