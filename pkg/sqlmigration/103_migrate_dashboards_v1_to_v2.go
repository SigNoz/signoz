package sqlmigration

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/tag"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type migrateDashboardsV1ToV2 struct {
	sqlschema      sqlschema.SQLSchema
	dashboardStore dashboardtypes.Store
	tagModule      tag.Module
	settings       factory.ProviderSettings
}

func NewMigrateDashboardsV1ToV2Factory(sqlschema sqlschema.SQLSchema, dashboardStore dashboardtypes.Store, tagModule tag.Module) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_dashboards_v1_to_v2"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateDashboardsV1ToV2{sqlschema: sqlschema, dashboardStore: dashboardStore, tagModule: tagModule, settings: ps}, nil
		},
	)
}

func (migration *migrateDashboardsV1ToV2) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up converts every v1 dashboard in every org to the v2 schema in place. Each
// dashboard — in its own transaction — runs the v4→v5 query migration, is
// converted to v2, has its stored data overwritten, and its tags synced.
// Dashboards already in v2 are skipped, and per-dashboard conversion failures are
// logged rather than aborting the run, so one irrecoverably malformed dashboard
// can't wedge startup.
func (migration *migrateDashboardsV1ToV2) Up(ctx context.Context, db *bun.DB) error {
	var orgIDs []string
	if err := db.NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs); err != nil {
		return err
	}

	for _, id := range orgIDs {
		orgID, err := valuer.NewUUID(id)
		if err != nil {
			return err
		}
		if err := migration.convertOrg(ctx, orgID); err != nil {
			return err
		}
	}

	// Every dashboard now has a name (migrated, or backfilled from the v1 title), so a
	// v2 dashboard's (org_id, name) can be made unique.
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	sqls := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{
		TableName:   "dashboard",
		ColumnNames: []sqlschema.ColumnName{"org_id", "name"},
	})
	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// convertOrg converts every v1 dashboard in the org, skipping v2 dashboards and
// recording (not propagating) per-dashboard failures.
func (migration *migrateDashboardsV1ToV2) convertOrg(ctx context.Context, orgID valuer.UUID) error {
	storables, err := migration.dashboardStore.List(ctx, orgID)
	if err != nil {
		return err
	}

	logger := migration.settings.Logger
	// The v1→v2 conversion assumes v5-shaped widget queries, so run the v4→v5
	// migration first (in place) — same pass the create path runs.
	v5 := transition.NewDashboardMigrateV5(logger, nil, nil)

	var migrated, skipped, failed int
	for _, storable := range storables {
		if storable.IsV2() {
			skipped++
			continue
		}

		v5.Migrate(ctx, storable.Data)

		if err := convertOneDashboardV1ToV2(ctx, migration.dashboardStore, migration.tagModule, orgID, storable); err != nil {
			failed++
			logger.WarnContext(ctx, "failed to convert dashboard from v1 to v2", slog.String("org_id", orgID.String()), slog.String("dashboard_id", storable.ID.String()), slog.Any("error", err))
			// Backfill the name column from the v1 title even though the data couldn't
			// migrate, so the dashboard stays findable by name. Only when it's unset, so a
			// retry doesn't regenerate a different (randomly-suffixed) name. Best-effort.
			if storable.Name == "" {
				if nameErr := migration.dashboardStore.UpdateName(ctx, orgID, storable.ID, storable.V1Name()); nameErr != nil {
					logger.ErrorContext(ctx, "failed to backfill name for unmigrated dashboard", slog.String("dashboard_id", storable.ID.String()), slog.Any("error", nameErr))
				}
			}
			continue
		}
		migrated++
	}

	logger.InfoContext(ctx, "converted dashboards from v1 to v2", slog.String("org_id", orgID.String()), slog.Int("total", len(storables)), slog.Int("migrated", migrated), slog.Int("skipped", skipped), slog.Int("failed", failed))
	return nil
}

// convertOneDashboardV1ToV2 converts a single v1 dashboard and, in one
// transaction, syncs its tags and overwrites its stored data with the v2 shape.
func convertOneDashboardV1ToV2(ctx context.Context, store dashboardtypes.Store, tagModule tag.Module, orgID valuer.UUID, storable *dashboardtypes.StorableDashboard) error {
	v2, err := storable.ConvertV1ToV2()
	if err != nil {
		return err
	}

	return store.RunInTx(ctx, func(ctx context.Context) error {
		resolvedTags, err := tagModule.SyncTags(ctx, orgID, coretypes.KindDashboard, v2.ID, tagtypes.NewPostableTagsFromTags(v2.Tags))
		if err != nil {
			return err
		}
		v2.Tags = resolvedTags

		v2Storable, err := v2.ToStorableDashboard()
		if err != nil {
			return err
		}

		return store.Update(ctx, orgID, v2Storable)
	})
}

func (migration *migrateDashboardsV1ToV2) Down(context.Context, *bun.DB) error {
	return nil
}
