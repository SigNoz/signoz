package sqlmigration

import (
	"context"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

// meterMetricNames are the SigNoz meter metrics: a metrics query aggregating one of
// these is a meter query. Spans what the frontend authors (log/span count and size,
// metric datapoint count) plus the backend platform.active meter.
var meterMetricNames = map[string]bool{
	"signoz.meter.log.count":              true,
	"signoz.meter.log.size":               true,
	"signoz.meter.span.count":             true,
	"signoz.meter.span.size":              true,
	"signoz.meter.metric.datapoint.count": true,
	"signoz.meter.platform.active":        true,
}

type fillDashboardMeterSource struct {
	sqlstore       sqlstore.SQLStore
	dashboardStore dashboardtypes.Store
	settings       factory.ProviderSettings
}

func NewFillDashboardMeterSourceFactory(sqlstore sqlstore.SQLStore, dashboardStore dashboardtypes.Store) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("fill_dashboard_meter_source"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &fillDashboardMeterSource{sqlstore: sqlstore, dashboardStore: dashboardStore, settings: ps}, nil
		},
	)
}

func (migration *fillDashboardMeterSource) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up restores the meter source on v2 dashboards mis-migrated by 103. That migration
// mapped a v1 meter query (dataSource metrics + source "meter") to a plain metrics
// query and dropped the source, so on clusters where 103 already ran those panels read
// non-meter data. Every metrics builder query aggregating a meter metric has its source
// set back to "meter". v1 dashboards are left alone — 103 now carries the source through
// when it runs. Runs in a single transaction so a mid-run failure leaves every dashboard
// untouched; a dashboard whose data can't be parsed as v2 is skipped.
func (migration *fillDashboardMeterSource) Up(ctx context.Context, _ *bun.DB) error {
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

// fillOrg fills the meter source on every v2 dashboard in the org that needs it. Runs
// inside the caller's transaction.
func (migration *fillDashboardMeterSource) fillOrg(ctx context.Context, orgID valuer.UUID) error {
	// List, not ListV2: ListV2 paginates and excludes system dashboards; a migration needs every row.
	storables, err := migration.dashboardStore.List(ctx, orgID)
	if err != nil {
		return err
	}

	logger := migration.settings.Logger
	var stillInV1, skippedNoMeter, wouldMigrateButErrored, migrated int
	for _, storable := range storables {
		// ToDashboardV2 rejects non-v2 data, so v1 dashboards fall through untouched.
		dashboard, err := storable.ToDashboardV2(nil)
		if err != nil {
			stillInV1++
			continue
		}
		if !fillMeterSource(&dashboard.Spec) {
			skippedNoMeter++
			continue
		}
		restorable, err := dashboard.ToStorableDashboard()
		if err != nil {
			wouldMigrateButErrored++
			logger.WarnContext(ctx, "failed to re-serialize dashboard after filling meter source", slog.String("org_id", orgID.String()), slog.String("dashboard_id", storable.ID.String()), slog.Any("error", err))
			continue
		}
		if err := migration.dashboardStore.Update(ctx, orgID, restorable); err != nil {
			return err
		}
		migrated++
	}

	logger.InfoContext(ctx, "filled meter source on v2 dashboards",
		slog.String("org_id", orgID.String()),
		slog.Int("total", len(storables)),
		slog.Int("still_in_v1", stillInV1),
		slog.Int("skipped_no_meter", skippedNoMeter),
		slog.Int("would_migrate_but_errored", wouldMigrateButErrored),
		slog.Int("migrated", migrated),
	)
	return nil
}

// fillMeterSource sets Source=meter on every metrics builder query in the spec whose
// aggregation targets a meter metric, reporting whether anything changed.
func fillMeterSource(spec *dashboardtypes.DashboardSpec) bool {
	changed := false
	for _, panel := range spec.Panels {
		if panel == nil {
			continue
		}
		for _, query := range panel.Spec.Queries {
			switch plugin := query.Spec.Plugin.Spec.(type) {
			case *qb.CompositeQuery:
				for i := range plugin.Queries {
					changed = setMeterSource(&plugin.Queries[i].Spec) || changed
				}
			case *dashboardtypes.BuilderQuerySpec:
				changed = setMeterSource(&plugin.Spec) || changed
			}
		}
	}
	return changed
}

// setMeterSource sets the meter source when spec holds a metrics builder query
// aggregating a meter metric. The assertion to QueryBuilderQuery[MetricAggregation] is
// itself the metrics-signal check — only metrics queries decode to that type — and the
// already-meter guard keeps repeated runs idempotent. The mutated value is written back
// through the pointer, since a value inside an interface isn't addressable.
func setMeterSource(spec *any) bool {
	query, ok := (*spec).(qb.QueryBuilderQuery[qb.MetricAggregation])
	if !ok || query.Source == telemetrytypes.SourceMeter {
		return false
	}
	for _, aggregation := range query.Aggregations {
		if meterMetricNames[aggregation.MetricName] {
			query.Source = telemetrytypes.SourceMeter
			*spec = query
			return true
		}
	}
	return false
}

func (migration *fillDashboardMeterSource) Down(context.Context, *bun.DB) error {
	return nil
}
