package sqlmigration

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/transition"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type queryBuilderV5Migration struct {
	store          sqlstore.SQLStore
	telemetryStore telemetrystore.TelemetryStore
	logger         *slog.Logger
}

func NewQueryBuilderV5MigrationFactory(
	store sqlstore.SQLStore,
	telemetryStore telemetrystore.TelemetryStore,
) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("query_builder_v5_migration"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return newQueryBuilderV5Migration(ctx, c, store, telemetryStore, ps.Logger)
		})
}

func newQueryBuilderV5Migration(
	_ context.Context,
	_ Config, store sqlstore.SQLStore,
	telemetryStore telemetrystore.TelemetryStore,
	logger *slog.Logger,
) (SQLMigration, error) {
	return &queryBuilderV5Migration{store: store, telemetryStore: telemetryStore, logger: logger}, nil
}

func (migration *queryBuilderV5Migration) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *queryBuilderV5Migration) getTraceDuplicateKeys(ctx context.Context) ([]string, error) {
	query := `
		SELECT tagKey
		FROM signoz_traces.distributed_span_attributes_keys
		WHERE tagType IN ('tag', 'resource')
		GROUP BY tagKey
		HAVING COUNT(DISTINCT tagType) > 1
		ORDER BY tagKey
	`

	rows, err := migration.telemetryStore.ClickhouseDB().Query(ctx, query)
	if err != nil {
		migration.logger.WarnContext(ctx, "failed to query trace duplicate keys", "error", err)
		return nil, nil
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			migration.logger.WarnContext(ctx, "failed to scan trace duplicate key", "error", err)
			continue
		}
		keys = append(keys, key)
	}

	return keys, nil
}

func (migration *queryBuilderV5Migration) getLogDuplicateKeys(ctx context.Context) ([]string, error) {
	query := `
		SELECT name
		FROM (
			SELECT DISTINCT name FROM signoz_logs.distributed_logs_attribute_keys
			INTERSECT
			SELECT DISTINCT name FROM signoz_logs.distributed_logs_resource_keys
		)
		ORDER BY name
	`

	rows, err := migration.telemetryStore.ClickhouseDB().Query(ctx, query)
	if err != nil {
		migration.logger.WarnContext(ctx, "failed to query log duplicate keys", "error", err)
		return nil, nil
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			migration.logger.WarnContext(ctx, "failed to scan log duplicate key", "error", err)
			continue
		}
		keys = append(keys, key)
	}

	return keys, nil
}

func (migration *queryBuilderV5Migration) Up(ctx context.Context, db *bun.DB) error {

	// fetch keys that have both attribute and resource attribute types
	logsKeys, err := migration.getLogDuplicateKeys(ctx)
	if err != nil {
		return err
	}

	tracesKeys, err := migration.getTraceDuplicateKeys(ctx)
	if err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if err := migration.migrateDashboards(ctx, tx, logsKeys, tracesKeys); err != nil {
		return err
	}

	if err := migration.migrateSavedViews(ctx, tx, logsKeys, tracesKeys); err != nil {
		return err
	}

	if err := migration.migrateRules(ctx, tx, logsKeys, tracesKeys); err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *queryBuilderV5Migration) Down(ctx context.Context, db *bun.DB) error {
	// this migration is not reversible as we're transforming the structure
	return nil
}

func (migration *queryBuilderV5Migration) migrateDashboards(
	ctx context.Context,
	tx bun.Tx,
	logsKeys []string,
	tracesKeys []string,
) error {
	var dashboards []struct {
		ID   string         `bun:"id"`
		Data map[string]any `bun:"data"`
	}

	err := tx.NewSelect().
		Table("dashboard").
		Column("id", "data").
		Scan(ctx, &dashboards)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	dashboardMigrator := transition.NewDashboardMigrateV5(migration.logger, logsKeys, tracesKeys)

	for _, dashboard := range dashboards {

		updated := dashboardMigrator.Migrate(ctx, dashboard.Data)

		if updated {
			dataJSON, err := json.Marshal(dashboard.Data)
			if err != nil {
				return err
			}

			_, err = tx.NewUpdate().
				Table("dashboard").
				Set("data = ?", string(dataJSON)).
				Where("id = ?", dashboard.ID).
				Exec(ctx)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (migration *queryBuilderV5Migration) migrateSavedViews(
	ctx context.Context,
	tx bun.Tx,
	logsKeys []string,
	tracesKeys []string,
) error {
	var savedViews []struct {
		ID   string `bun:"id"`
		Data string `bun:"data"`
	}

	err := tx.NewSelect().
		Table("saved_views").
		Column("id", "data").
		Scan(ctx, &savedViews)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	savedViewsMigrator := transition.NewSavedViewMigrateV5(migration.logger, logsKeys, tracesKeys)

	for _, savedView := range savedViews {
		var data map[string]any
		if err := json.Unmarshal([]byte(savedView.Data), &data); err != nil {
			continue // invalid JSON
		}

		updated := savedViewsMigrator.Migrate(ctx, data)

		if updated {
			dataJSON, err := json.Marshal(data)

			if err != nil {
				return err
			}

			_, err = tx.NewUpdate().
				Table("saved_views").
				Set("data = ?", string(dataJSON)).
				Where("id = ?", savedView.ID).
				Exec(ctx)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (migration *queryBuilderV5Migration) migrateRules(
	ctx context.Context,
	tx bun.Tx,
	logsKeys []string,
	tracesKeys []string,
) error {
	// Fetch all rules
	var rules []struct {
		ID   string         `bun:"id"`
		Data map[string]any `bun:"data"`
	}

	err := tx.NewSelect().
		Table("rule").
		Column("id", "data").
		Scan(ctx, &rules)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	alertsMigrator := transition.NewAlertMigrateV5(migration.logger, logsKeys, tracesKeys)

	for _, rule := range rules {
		migration.logger.InfoContext(ctx, "migrating rule", "rule_id", rule.ID)

		updated := alertsMigrator.Migrate(ctx, rule.Data)

		if updated {
			dataJSON, err := json.Marshal(rule.Data)
			if err != nil {
				return err
			}

			_, err = tx.NewUpdate().
				Table("rule").
				Set("data = ?", string(dataJSON)).
				Where("id = ?", rule.ID).
				Exec(ctx)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
