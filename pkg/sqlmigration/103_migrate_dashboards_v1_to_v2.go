package sqlmigration

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard"
	"github.com/SigNoz/signoz/pkg/modules/tag/impltag"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migrateDashboardsV1ToV2 struct {
	sqlstore sqlstore.SQLStore
	settings factory.ProviderSettings
}

func NewMigrateDashboardsV1ToV2Factory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_dashboards_v1_to_v2"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateDashboardsV1ToV2{sqlstore: sqlstore, settings: ps}, nil
		},
	)
}

func (migration *migrateDashboardsV1ToV2) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up converts every v1 dashboard in every org to the v2 schema in place. It
// delegates to the dashboard module's ConvertAllV1ToV2, which — per dashboard,
// in its own transaction — runs the v4→v5 query migration, converts to v2,
// overwrites the stored data, and syncs tags. Dashboards already in v2 are
// skipped and per-dashboard conversion failures are recorded rather than
// aborting the run, so one irrecoverably malformed dashboard can't wedge startup.
func (migration *migrateDashboardsV1ToV2) Up(ctx context.Context, db *bun.DB) error {
	var orgIDs []string
	if err := db.NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs); err != nil {
		return err
	}

	dashboardModule := impldashboard.NewModule(
		impldashboard.NewStore(migration.sqlstore),
		migration.settings,
		nil, // analytics, orgGetter, and queryParser are unused on the conversion path
		nil,
		nil,
		impltag.NewModule(impltag.NewStore(migration.sqlstore)),
	)

	logger := migration.settings.Logger
	for _, id := range orgIDs {
		orgID, err := valuer.NewUUID(id)
		if err != nil {
			return err
		}

		result, err := dashboardModule.ConvertAllV1ToV2(ctx, orgID)
		if err != nil {
			return err
		}

		logger.InfoContext(ctx, "converted dashboards from v1 to v2",
			slog.String("org_id", id),
			slog.Int("total", result.Total),
			slog.Int("migrated", result.Migrated),
			slog.Int("skipped", result.Skipped),
			slog.Int("failed", result.Failed),
		)
		for _, item := range result.Results {
			if item.Status == "failed" {
				logger.WarnContext(ctx, "failed to convert dashboard from v1 to v2",
					slog.String("org_id", id),
					slog.String("dashboard_id", item.ID),
					slog.String("error", item.Error),
				)
			}
		}
	}

	return nil
}

func (migration *migrateDashboardsV1ToV2) Down(context.Context, *bun.DB) error {
	return nil
}
