package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

const deploymentEnvironmentCurrent = "deployment.environment.name"

type migrateDeploymentEnvironmentQuickFilter struct {
	logger *slog.Logger
}

type semconvQuickFilterRow struct {
	bun.BaseModel `bun:"table:quick_filter"`

	ID     string `bun:"id"`
	Filter string `bun:"filter"`
}

func NewMigrateDeploymentEnvironmentQuickFilterFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_semconv_quick_filter"),
		func(_ context.Context, settings factory.ProviderSettings, _ Config) (SQLMigration, error) {
			return &migrateDeploymentEnvironmentQuickFilter{logger: settings.Logger}, nil
		},
	)
}

func (migration *migrateDeploymentEnvironmentQuickFilter) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func deploymentEnvironmentOld() string {
	members := semconv.Members(semconv.KindAttribute, telemetrytypes.FieldKeySelector{
		Name:         deploymentEnvironmentCurrent,
		Signal:       telemetrytypes.SignalTraces,
		FieldContext: telemetrytypes.FieldContextResource,
	})
	if len(members) < 2 {
		return deploymentEnvironmentCurrent
	}
	return members[1]
}

func rewriteQuickFilterSemconv(filterJSON, from, to string) (string, bool, error) {
	var filters []map[string]any
	if err := json.Unmarshal([]byte(filterJSON), &filters); err != nil {
		return "", false, err
	}

	changed := false
	for _, filter := range filters {
		if key, ok := filter["key"].(string); ok && key == from {
			filter["key"] = to
			changed = true
		}
	}
	if !changed {
		return filterJSON, false, nil
	}

	rewritten, err := json.Marshal(filters)
	if err != nil {
		return "", false, err
	}
	return string(rewritten), true, nil
}

func (migration *migrateDeploymentEnvironmentQuickFilter) migrate(ctx context.Context, db *bun.DB, from, to string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	rows := make([]*semconvQuickFilterRow, 0)
	if err := tx.NewSelect().
		Model(&rows).
		Where("signal IN (?)", bun.In([]string{"traces", "api_monitoring", "exceptions"})).
		Scan(ctx); err != nil {
		return err
	}

	for _, row := range rows {
		rewritten, changed, err := rewriteQuickFilterSemconv(row.Filter, from, to)
		if err != nil {
			// Quick filters are user-editable. One malformed legacy row must not
			// prevent the application from starting or block every other org's
			// migration.
			if migration.logger != nil {
				migration.logger.WarnContext(ctx, "skipping quick filter with unreadable filter JSON",
					slog.String("quick_filter_id", row.ID), slog.Any("error", err))
			}
			continue
		}
		if !changed {
			continue
		}
		if _, err := tx.NewUpdate().
			Model((*semconvQuickFilterRow)(nil)).
			Set("filter = ?", rewritten).
			Set("updated_at = ?", time.Now()).
			Where("id = ?", row.ID).
			Exec(ctx); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *migrateDeploymentEnvironmentQuickFilter) Up(ctx context.Context, db *bun.DB) error {
	return migration.migrate(ctx, db, deploymentEnvironmentOld(), deploymentEnvironmentCurrent)
}

func (migration *migrateDeploymentEnvironmentQuickFilter) Down(ctx context.Context, db *bun.DB) error {
	return migration.migrate(ctx, db, deploymentEnvironmentCurrent, deploymentEnvironmentOld())
}
