package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type dashboardAxesRow struct {
	bun.BaseModel `bun:"table:dashboard"`

	ID   string `bun:"id,pk"`
	Data string `bun:"data"`
}

type clearDashboardAxesSoftBounds struct {
	settings factory.ProviderSettings
}

func NewClearDashboardAxesSoftBoundsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("clear_dashboard_axes_soft_bounds"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &clearDashboardAxesSoftBounds{settings: ps}, nil
	})
}

func (migration *clearDashboardAxesSoftBounds) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up nulls the axes soft bounds of every v2 panel holding the pair 0/0. v1 seeded that pair
// into each new widget as its "unset" default and migrate_dashboards_v1_to_v2 copied it over
// verbatim, so the chart layer had to ignore it to keep migrated panels auto-scaling — which
// left a deliberate soft min of 0 unsettable. Clearing the sentinel in stored data lets the
// chart honour an explicit 0.
//
// v1 rows have no spec object and so are skipped by the walk rather than by a version check,
// which keeps this migration indifferent to later schema versions.
func (migration *clearDashboardAxesSoftBounds) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*dashboardAxesRow
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	var migrated, skipped int
	for _, row := range rows {
		cleared, changed, ok := clearAxesSoftBounds(row.Data)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "dashboard data could not be parsed, leaving it untouched", slog.String("dashboard_id", row.ID))
			skipped++
			continue
		}
		if !changed {
			continue
		}

		migrated++
		if _, err := tx.NewUpdate().Model((*dashboardAxesRow)(nil)).Set("data = ?", cleared).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "cleared default axes soft bounds on dashboard panels", slog.Int("total", len(rows)), slog.Int("migrated", migrated), slog.Int("skipped", skipped))

	return tx.Commit()
}

func (migration *clearDashboardAxesSoftBounds) Down(context.Context, *bun.DB) error {
	return nil
}

// clearAxesSoftBounds rewrites stored dashboard data, nulling softMin and softMax on every
// panel whose axes hold 0/0. Panels of any other shape are left as they are, so a malformed
// one still surfaces as a validation error later; ok=false means unparseable.
func clearAxesSoftBounds(data string) (cleared string, changed bool, ok bool) {
	var dashboard map[string]any
	if err := json.Unmarshal([]byte(data), &dashboard); err != nil {
		return "", false, false
	}

	spec, _ := dashboard["spec"].(map[string]any)
	panels, _ := spec["panels"].(map[string]any)
	for _, panel := range panels {
		axes, found := dashboardPanelAxes(panel)
		if !found || !isZeroJSONNumber(axes["softMin"]) || !isZeroJSONNumber(axes["softMax"]) {
			continue
		}
		axes["softMin"] = nil
		axes["softMax"] = nil
		changed = true
	}

	if !changed {
		return "", false, true
	}

	clearedJSON, err := marshalUnescaped(dashboard)
	if err != nil {
		return "", false, false
	}
	return string(clearedJSON), true, true
}

// dashboardPanelAxes walks spec.plugin.spec.axes on one panel. Only the time series and bar
// chart plugins carry an axes slice; every other kind misses at one of these hops.
func dashboardPanelAxes(panel any) (map[string]any, bool) {
	for _, key := range []string{"spec", "plugin", "spec", "axes"} {
		object, ok := panel.(map[string]any)
		if !ok {
			return nil, false
		}
		panel = object[key]
	}

	axes, ok := panel.(map[string]any)
	return axes, ok
}

func isZeroJSONNumber(value any) bool {
	number, ok := value.(float64)
	return ok && number == 0
}
