package ingest

import (
	"context"
	"database/sql"
	"fmt"
)

// Schema ownership lives here (the signoz-ob data plane) rather than in the
// gateway: the same process that reads signoz.* is now the sole writer and the
// sole creator/validator of those tables. DDL is a verbatim port of the retired
// antcollector oceanbaseexporter schema.go so the storage contract is unchanged.

func tableName(prefix, suffix string) string {
	return fmt.Sprintf("`%s_%s`", prefix, suffix)
}

func spansTable(prefix string) string   { return tableName(prefix, "traces") }
func logsTable(prefix string) string    { return tableName(prefix, "logs") }
func metricsTable(prefix string) string { return tableName(prefix, "metric_samples") }

func ensureSchema(ctx context.Context, db *sql.DB, prefix string) error {
	statements := []string{
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (
  org_id VARCHAR(255) NOT NULL DEFAULT 'default',
  space_id VARCHAR(255) NOT NULL DEFAULT '',
  timestamp BIGINT UNSIGNED NOT NULL,
  trace_id VARCHAR(32) NOT NULL,
  span_id VARCHAR(16) NOT NULL,
  parent_span_id VARCHAR(16) NOT NULL DEFAULT '',
  trace_state TEXT,
  flags BIGINT UNSIGNED NOT NULL DEFAULT 0,
  span_name VARCHAR(512) NOT NULL,
  span_kind VARCHAR(32) NOT NULL,
  service_name VARCHAR(255) NOT NULL DEFAULT '',
  start_time_unix_nano BIGINT UNSIGNED NOT NULL,
  end_time_unix_nano BIGINT UNSIGNED NOT NULL,
  duration_nano BIGINT UNSIGNED NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 0,
  status_message TEXT,
  resource_schema_url VARCHAR(512) NOT NULL DEFAULT '',
  scope_schema_url VARCHAR(512) NOT NULL DEFAULT '',
  scope_name VARCHAR(255) NOT NULL DEFAULT '',
  scope_version VARCHAR(255) NOT NULL DEFAULT '',
  scope_attributes LONGTEXT NOT NULL,
  resource_attributes LONGTEXT NOT NULL,
  attributes LONGTEXT NOT NULL,
  events LONGTEXT NOT NULL,
  links LONGTEXT NOT NULL,
  payload LONGTEXT NOT NULL,
  run_id VARCHAR(255) NOT NULL DEFAULT '',
  session_id VARCHAR(255) NOT NULL DEFAULT '',
  user_id VARCHAR(255) NOT NULL DEFAULT '',
  agent_product VARCHAR(255) NOT NULL DEFAULT '',
  agent_name VARCHAR(255) NOT NULL DEFAULT '',
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (org_id, space_id, trace_id, span_id),
  KEY idx_span_start (timestamp),
  KEY idx_span_service_time (org_id, service_name, timestamp),
  KEY idx_span_space_agent_time (org_id, space_id, agent_product, timestamp),
	KEY idx_span_space_session_time (org_id, space_id, session_id, timestamp),
  KEY idx_span_run_time (org_id, run_id, timestamp)
) DEFAULT CHARSET=utf8mb4`, spansTable(prefix)),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (
  org_id VARCHAR(255) NOT NULL DEFAULT 'default',
  space_id VARCHAR(255) NOT NULL DEFAULT '',
  log_id VARCHAR(64) NOT NULL,
  timestamp BIGINT UNSIGNED NOT NULL,
  timestamp_unix_nano BIGINT UNSIGNED NOT NULL,
  observed_time_unix_nano BIGINT UNSIGNED NOT NULL,
  trace_id VARCHAR(32) NOT NULL DEFAULT '',
  span_id VARCHAR(16) NOT NULL DEFAULT '',
  flags BIGINT UNSIGNED NOT NULL DEFAULT 0,
  severity_number SMALLINT NOT NULL DEFAULT 0,
  severity_text VARCHAR(64) NOT NULL DEFAULT '',
  severity VARCHAR(64) NOT NULL DEFAULT '',
  event_name VARCHAR(255) NOT NULL DEFAULT '',
  body_text LONGTEXT NOT NULL,
  body LONGTEXT NOT NULL,
  body_json LONGTEXT NOT NULL,
  service_name VARCHAR(255) NOT NULL DEFAULT '',
  resource_schema_url VARCHAR(512) NOT NULL DEFAULT '',
  scope_schema_url VARCHAR(512) NOT NULL DEFAULT '',
  scope_name VARCHAR(255) NOT NULL DEFAULT '',
  scope_version VARCHAR(255) NOT NULL DEFAULT '',
  scope_attributes LONGTEXT NOT NULL,
  resource_attributes LONGTEXT NOT NULL,
  attributes LONGTEXT NOT NULL,
  payload LONGTEXT NOT NULL,
  run_id VARCHAR(255) NOT NULL DEFAULT '',
  session_id VARCHAR(255) NOT NULL DEFAULT '',
  user_id VARCHAR(255) NOT NULL DEFAULT '',
  agent_product VARCHAR(255) NOT NULL DEFAULT '',
  agent_name VARCHAR(255) NOT NULL DEFAULT '',
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (org_id, space_id, log_id),
  KEY idx_log_time (timestamp),
  KEY idx_log_trace_time (org_id, trace_id, timestamp),
  KEY idx_log_service_time (org_id, service_name, timestamp),
  KEY idx_log_space_agent_time (org_id, space_id, agent_product, timestamp),
	KEY idx_log_space_session_time (org_id, space_id, session_id, timestamp),
  KEY idx_log_run_time (org_id, run_id, timestamp)
) DEFAULT CHARSET=utf8mb4`, logsTable(prefix)),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (
  org_id VARCHAR(255) NOT NULL DEFAULT 'default',
  space_id VARCHAR(255) NOT NULL DEFAULT '',
  sample_id VARCHAR(64) NOT NULL,
  metric_name VARCHAR(512) NOT NULL,
  metric_type VARCHAR(32) NOT NULL,
  description TEXT,
  unit VARCHAR(128) NOT NULL DEFAULT '',
  timestamp BIGINT UNSIGNED NOT NULL,
  timestamp_unix_nano BIGINT UNSIGNED NOT NULL,
  start_time_unix_nano BIGINT UNSIGNED NOT NULL,
  value DOUBLE NULL,
  count_value BIGINT UNSIGNED NULL,
  sum_value DOUBLE NULL,
  min_value DOUBLE NULL,
  max_value DOUBLE NULL,
  aggregation_temporality VARCHAR(32) NOT NULL DEFAULT '',
  is_monotonic TINYINT(1) NOT NULL DEFAULT 0,
  flags BIGINT UNSIGNED NOT NULL DEFAULT 0,
  point_data LONGTEXT NOT NULL,
  payload LONGTEXT NOT NULL,
  service_name VARCHAR(255) NOT NULL DEFAULT '',
  resource_schema_url VARCHAR(512) NOT NULL DEFAULT '',
  scope_schema_url VARCHAR(512) NOT NULL DEFAULT '',
  scope_name VARCHAR(255) NOT NULL DEFAULT '',
  scope_version VARCHAR(255) NOT NULL DEFAULT '',
  scope_attributes LONGTEXT NOT NULL,
  resource_attributes LONGTEXT NOT NULL,
  attributes LONGTEXT NOT NULL,
  run_id VARCHAR(255) NOT NULL DEFAULT '',
  session_id VARCHAR(255) NOT NULL DEFAULT '',
  user_id VARCHAR(255) NOT NULL DEFAULT '',
  agent_product VARCHAR(255) NOT NULL DEFAULT '',
  agent_name VARCHAR(255) NOT NULL DEFAULT '',
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (org_id, space_id, sample_id),
  KEY idx_metric_time (timestamp),
  KEY idx_metric_name_time (org_id, metric_name(191), timestamp),
  KEY idx_metric_service_time (org_id, service_name, timestamp),
  KEY idx_metric_space_agent_time (org_id, space_id, agent_product, timestamp),
	KEY idx_metric_space_session_time (org_id, space_id, session_id, timestamp),
  KEY idx_metric_run_time (org_id, run_id, timestamp)
) DEFAULT CHARSET=utf8mb4`, metricsTable(prefix)),
	}

	for _, statement := range statements {
		if _, err := db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("create OceanBase telemetry table: %w", err)
		}
	}
	return ensureSpaceSchema(ctx, db, prefix)
}

type spaceSchemaIndex struct {
	name    string
	columns string
}

// ensureSpaceSchema upgrades pre-space tables in place: it adds the space_id
// column, folds it into the primary key and creates the space-scoped indexes.
// Idempotent, so it is safe to run on every signoz-ob start.
func ensureSpaceSchema(ctx context.Context, db *sql.DB, prefix string) error {
	upgrades := []struct {
		table      string
		primaryKey string
		indexes    []spaceSchemaIndex
	}{
		{prefix + "_traces", "org_id, space_id, trace_id, span_id", []spaceSchemaIndex{
			{"idx_span_space_agent_time", "org_id, space_id, agent_product, timestamp"},
			{"idx_span_space_session_time", "org_id, space_id, session_id, timestamp"},
		}},
		{prefix + "_logs", "org_id, space_id, log_id", []spaceSchemaIndex{
			{"idx_log_space_agent_time", "org_id, space_id, agent_product, timestamp"},
			{"idx_log_space_session_time", "org_id, space_id, session_id, timestamp"},
		}},
		{prefix + "_metric_samples", "org_id, space_id, sample_id", []spaceSchemaIndex{
			{"idx_metric_space_agent_time", "org_id, space_id, agent_product, timestamp"},
			{"idx_metric_space_session_time", "org_id, space_id, session_id, timestamp"},
		}},
	}

	for _, upgrade := range upgrades {
		columnExists, err := schemaObjectExists(ctx, db,
			"SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
			upgrade.table, "space_id")
		if err != nil {
			return fmt.Errorf("inspect %s.space_id: %w", upgrade.table, err)
		}
		if !columnExists {
			if _, err := db.ExecContext(ctx, "ALTER TABLE `"+upgrade.table+"` ADD COLUMN space_id VARCHAR(255) NOT NULL DEFAULT '' AFTER org_id"); err != nil {
				return fmt.Errorf("add %s.space_id: %w", upgrade.table, err)
			}
		}
		primaryIncludesSpace, err := schemaObjectExists(ctx, db,
			"SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY' AND COLUMN_NAME = ?",
			upgrade.table, "space_id")
		if err != nil {
			return fmt.Errorf("inspect %s primary key: %w", upgrade.table, err)
		}
		if !primaryIncludesSpace {
			statement := "ALTER TABLE `" + upgrade.table + "` DROP PRIMARY KEY, ADD PRIMARY KEY (" + upgrade.primaryKey + ")"
			if _, err := db.ExecContext(ctx, statement); err != nil {
				return fmt.Errorf("upgrade %s primary key: %w", upgrade.table, err)
			}
		}
		for _, index := range upgrade.indexes {
			indexExists, err := schemaObjectExists(ctx, db,
				"SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
				upgrade.table, index.name)
			if err != nil {
				return fmt.Errorf("inspect %s.%s: %w", upgrade.table, index.name, err)
			}
			if !indexExists {
				statement := "ALTER TABLE `" + upgrade.table + "` ADD KEY `" + index.name + "` (" + index.columns + ")"
				if _, err := db.ExecContext(ctx, statement); err != nil {
					return fmt.Errorf("add %s.%s: %w", upgrade.table, index.name, err)
				}
			}
		}
	}
	return nil
}

func schemaObjectExists(ctx context.Context, db *sql.DB, query string, args ...any) (bool, error) {
	var count int
	if err := db.QueryRowContext(ctx, query, args...).Scan(&count); err != nil {
		return false, err
	}
	return count > 0, nil
}
