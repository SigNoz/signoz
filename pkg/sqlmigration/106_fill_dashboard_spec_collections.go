package sqlmigration

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

// Required, non-nullable v2 spec fields, mapped to their empty value.
var nullableSpecCollections = map[string]any{
	"variables": []any{},
	"panels":    map[string]any{},
	"layouts":   []any{},
}

type fillDashboardSpecCollections struct {
	sqlstore       sqlstore.SQLStore
	dashboardStore dashboardtypes.Store
	settings       factory.ProviderSettings
}

func NewFillDashboardSpecCollectionsFactory(sqlstore sqlstore.SQLStore, dashboardStore dashboardtypes.Store) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("fill_dashboard_spec_collections"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &fillDashboardSpecCollections{sqlstore: sqlstore, dashboardStore: dashboardStore, settings: ps}, nil
		},
	)
}

func (migration *fillDashboardSpecCollections) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up replaces a missing or null spec.variables / spec.panels / spec.layouts with the
// empty collection. One transaction; v1 dashboards are skipped.
func (migration *fillDashboardSpecCollections) Up(ctx context.Context, _ *bun.DB) error {
	return migration.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		var orgIDs []string
		if err := migration.sqlstore.BunDBCtx(ctx).NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs); err != nil {
			return err
		}

		for _, id := range orgIDs {
			orgID, err := valuer.NewUUID(id)
			if err != nil {
				return err
			}
			if err := migration.fillOrg(ctx, orgID); err != nil {
				return err
			}
		}

		return nil
	})
}

// fillOrg fills every v2 dashboard in the org that needs it, inside the caller's transaction.
func (migration *fillDashboardSpecCollections) fillOrg(ctx context.Context, orgID valuer.UUID) error {
	// List, not ListV2: ListV2 paginates and excludes system dashboards; a migration needs every row.
	storables, err := migration.dashboardStore.List(ctx, orgID)
	if err != nil {
		return err
	}

	logger := migration.settings.Logger
	var stillInV1, malformedSpec, skippedNoNulls, migrated int
	for _, storable := range storables {
		if !storable.IsV2() {
			stillInV1++
			continue
		}
		// Raw data, not ToDashboardV2: decoding validates, and these are the rows it rejects.
		spec, ok := storable.Data["spec"].(map[string]any)
		if !ok {
			malformedSpec++
			logger.WarnContext(ctx, "v2 dashboard has no spec object; leaving it untouched", slog.String("org_id", orgID.String()), slog.String("dashboard_id", storable.ID.String()))
			continue
		}
		if !fillSpecCollections(spec) {
			skippedNoNulls++
			continue
		}
		if err := migration.dashboardStore.Update(ctx, orgID, storable); err != nil {
			return err
		}
		migrated++
	}

	logger.InfoContext(ctx, "filled required collections on v2 dashboards",
		slog.String("org_id", orgID.String()),
		slog.Int("total", len(storables)),
		slog.Int("still_in_v1", stillInV1),
		slog.Int("malformed_spec", malformedSpec),
		slog.Int("skipped_no_nulls", skippedNoNulls),
		slog.Int("migrated", migrated),
	)
	return nil
}

// fillSpecCollections empties each absent or null required collection, reporting whether
// anything changed. A present value is left alone whatever its shape, so a malformed one
// still surfaces as a validation error.
func fillSpecCollections(spec map[string]any) bool {
	changed := false
	for field, empty := range nullableSpecCollections {
		if value, present := spec[field]; !present || value == nil {
			spec[field] = empty
			changed = true
		}
	}
	return changed
}

func (migration *fillDashboardSpecCollections) Down(context.Context, *bun.DB) error {
	return nil
}
