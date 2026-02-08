package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type createRuleStateHistoryV2 struct {
	telemetryStore telemetrystore.TelemetryStore
}

func NewCreateRuleStateHistoryV2Factory(telemetryStore telemetrystore.TelemetryStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("create_rule_state_history_v2"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return &createRuleStateHistoryV2{telemetryStore: telemetryStore}, nil
	})
}

func (migration *createRuleStateHistoryV2) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *createRuleStateHistoryV2) Up(ctx context.Context, db *bun.DB) error {
	// Create the local MergeTree table.
	if err := migration.telemetryStore.ClickhouseDB().Exec(ctx, `
		CREATE TABLE IF NOT EXISTS signoz_analytics.rule_state_history_v2
		(
			org_id              LowCardinality(String),
			rule_id             String,
			rule_name           String,
			fingerprint         UInt64,
			labels              String,
			state               LowCardinality(String),
			state_changed       Bool DEFAULT true,
			value               Float64,
			unix_milli          Int64,
			overall_state       LowCardinality(String),
			overall_state_changed Bool
		)
		ENGINE = MergeTree()
		PARTITION BY toDate(unix_milli / 1000)
		ORDER BY (org_id, rule_id, fingerprint, unix_milli)
		TTL toDate(unix_milli / 1000) + INTERVAL 90 DAY
	`); err != nil {
		return err
	}

	// Create the distributed table.
	if err := migration.telemetryStore.ClickhouseDB().Exec(ctx, `
		CREATE TABLE IF NOT EXISTS signoz_analytics.distributed_rule_state_history_v2
		AS signoz_analytics.rule_state_history_v2
		ENGINE = Distributed('cluster', 'signoz_analytics', 'rule_state_history_v2', cityHash64(rule_id))
	`); err != nil {
		return err
	}

	return nil
}

func (migration *createRuleStateHistoryV2) Down(ctx context.Context, db *bun.DB) error {
	if err := migration.telemetryStore.ClickhouseDB().Exec(ctx, `
		DROP TABLE IF EXISTS signoz_analytics.distributed_rule_state_history_v2
	`); err != nil {
		return err
	}

	if err := migration.telemetryStore.ClickhouseDB().Exec(ctx, `
		DROP TABLE IF EXISTS signoz_analytics.rule_state_history_v2
	`); err != nil {
		return err
	}

	return nil
}
