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

type migrateRulesV4ToV5 struct {
	store          sqlstore.SQLStore
	telemetryStore telemetrystore.TelemetryStore
	logger         *slog.Logger
}

func NewMigrateRulesV4ToV5Factory(
	store sqlstore.SQLStore,
	telemetryStore telemetrystore.TelemetryStore,
) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("migrate_rules_post_deprecation"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &migrateRulesV4ToV5{
				store:          store,
				telemetryStore: telemetryStore,
				logger:         ps.Logger,
			}, nil
		})
}

func (migration *migrateRulesV4ToV5) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *migrateRulesV4ToV5) getLogDuplicateKeys(ctx context.Context) ([]string, error) {
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

func (migration *migrateRulesV4ToV5) getTraceDuplicateKeys(ctx context.Context) ([]string, error) {
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

func (migration *migrateRulesV4ToV5) Up(ctx context.Context, db *bun.DB) error {
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

	var rules []struct {
		ID   string         `bun:"id"`
		Data map[string]any `bun:"data"`
	}

	err = tx.NewSelect().
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

	count := 0

	for _, rule := range rules {
		version, _ := rule.Data["version"].(string)

		if version == "v5" {
			continue
		}

		if version == "" {
			migration.logger.WarnContext(ctx, "unexpected empty version for rule", "rule_id", rule.ID)
		}

		migration.logger.InfoContext(ctx, "migrating rule v4 to v5", "rule_id", rule.ID, "current_version", version)

		// Check if the queries envelope already exists and is non-empty
		hasQueriesEnvelope := false
		if condition, ok := rule.Data["condition"].(map[string]any); ok {
			if compositeQuery, ok := condition["compositeQuery"].(map[string]any); ok {
				if queries, ok := compositeQuery["queries"].([]any); ok && len(queries) > 0 {
					hasQueriesEnvelope = true
				}
			}
		}

		if hasQueriesEnvelope {
			// already has queries envelope, just bump version
			// this is because user made a mistake of choosing version
			migration.logger.InfoContext(ctx, "rule already has queries envelope, bumping version", "rule_id", rule.ID)
			rule.Data["version"] = "v5"
		} else {
			// old format, run full migration
			migration.logger.InfoContext(ctx, "rule has old format, running full migration", "rule_id", rule.ID)
			updated := alertsMigrator.Migrate(ctx, rule.Data)
			if !updated {
				migration.logger.WarnContext(ctx, "expected updated to be true but got false", "rule_id", rule.ID)
				continue
			}
			rule.Data["version"] = "v5"
		}

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
		count++
	}
	if count != 0 {
		migration.logger.InfoContext(ctx, "migrate v4 alerts", "count", count)
	}

	return tx.Commit()
}

func (migration *migrateRulesV4ToV5) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
