package migrate

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/jmoiron/sqlx"
)

type DataMigration struct {
	ID        int    `db:"id"`
	Version   string `db:"version"`
	CreatedAt string `db:"created_at"`
	Succeeded bool   `db:"succeeded"`
}

func initSchema(conn *sqlx.DB) error {
	tableSchema := `
		CREATE TABLE IF NOT EXISTS data_migrations (
			id SERIAL PRIMARY KEY,
			version VARCHAR(255) NOT NULL UNIQUE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			succeeded BOOLEAN NOT NULL DEFAULT FALSE
		);
	`
	_, err := conn.Exec(tableSchema)
	if err != nil {
		return err
	}
	return nil
}

func getMigrationVersion(conn *sqlx.DB, version string) (*DataMigration, error) {
	var migration DataMigration
	err := conn.Get(&migration, "SELECT * FROM data_migrations WHERE version = $1", version)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &migration, nil
}

func Migrate(dsn string) error {
	conn, err := sqlx.Connect("sqlite3", dsn)
	if err != nil {
		return err
	}
	if err := initSchema(conn); err != nil {
		return err
	}

	return nil
}

func ClickHouseMigrate(conn driver.Conn, cluster string) error {

	database := "CREATE DATABASE IF NOT EXISTS signoz_analytics ON CLUSTER %s"

	localTable := `CREATE TABLE IF NOT EXISTS signoz_analytics.rule_state_history_v0 ON CLUSTER %s
(
	_retention_days UInt32 DEFAULT 180,
    rule_id LowCardinality(String),
    rule_name LowCardinality(String),
    overall_state LowCardinality(String),
    overall_state_changed Bool,
    state LowCardinality(String),
    state_changed Bool,
    unix_milli Int64 CODEC(Delta(8), ZSTD(1)),
    fingerprint UInt64 CODEC(ZSTD(1)),
    value Float64 CODEC(Gorilla, ZSTD(1)),
    labels String CODEC(ZSTD(5)),
)
ENGINE = MergeTree
PARTITION BY toDate(unix_milli / 1000)
ORDER BY (rule_id, unix_milli)
TTL toDateTime(unix_milli / 1000) + toIntervalDay(_retention_days)
SETTINGS ttl_only_drop_parts = 1, index_granularity = 8192`

	distributedTable := `CREATE TABLE IF NOT EXISTS signoz_analytics.distributed_rule_state_history_v0 ON CLUSTER %s
(
    rule_id LowCardinality(String),
    rule_name LowCardinality(String),
    overall_state LowCardinality(String),
    overall_state_changed Bool,
    state LowCardinality(String),
    state_changed Bool,
    unix_milli Int64 CODEC(Delta(8), ZSTD(1)),
    fingerprint UInt64 CODEC(ZSTD(1)),
    value Float64 CODEC(Gorilla, ZSTD(1)),
    labels String CODEC(ZSTD(5)),
)
ENGINE = Distributed(%s, signoz_analytics, rule_state_history_v0, cityHash64(rule_id, rule_name, fingerprint))`

	// check if db exists
	dbExists := `SELECT count(*) FROM system.databases WHERE name = 'signoz_analytics'`
	var count uint64
	err := conn.QueryRow(context.Background(), dbExists).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		err = conn.Exec(context.Background(), fmt.Sprintf(database, cluster))
		if err != nil {
			return err
		}
	}

	// check if table exists
	tableExists := `SELECT count(*) FROM system.tables WHERE name = 'rule_state_history_v0' AND database = 'signoz_analytics'`
	var tableCount uint64
	err = conn.QueryRow(context.Background(), tableExists).Scan(&tableCount)
	if err != nil {
		return err
	}

	if tableCount == 0 {
		err = conn.Exec(context.Background(), fmt.Sprintf(localTable, cluster))
		if err != nil {
			return err
		}
	}

	// check if distributed table exists
	distributedTableExists := `SELECT count(*) FROM system.tables WHERE name = 'distributed_rule_state_history_v0' AND database = 'signoz_analytics'`
	var distributedTableCount uint64
	err = conn.QueryRow(context.Background(), distributedTableExists).Scan(&distributedTableCount)
	if err != nil {
		return err
	}

	if distributedTableCount == 0 {
		err = conn.Exec(context.Background(), fmt.Sprintf(distributedTable, cluster, cluster))
		if err != nil {
			return err
		}
	}

	return nil
}
