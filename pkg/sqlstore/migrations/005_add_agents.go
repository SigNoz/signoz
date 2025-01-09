package migrations

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/sqlstore"
)

type addAgents struct {
	config sqlstore.MigrationConfig
}

func NewAddAgentsMigrationFactory() sqlstore.MigrationFactory {
	return sqlstore.NewMigrationFactory(newAddAgents)
}

func newAddAgents(config sqlstore.MigrationConfig) sqlstore.Migration {
	return &addAgents{config: config}
}

func (migration *addAgents) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAgents) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS agents (
		agent_id TEXT PRIMARY KEY UNIQUE,
		started_at datetime NOT NULL,
		terminated_at datetime,
		current_status TEXT NOT NULL,
		effective_config TEXT NOT NULL
	);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS agent_config_versions(
		id TEXT PRIMARY KEY,
		created_by TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_by TEXT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		version INTEGER DEFAULT 1,
		active int,
		is_valid int,
		disabled int,
		element_type VARCHAR(120) NOT NULL,
		deploy_status VARCHAR(80) NOT NULL DEFAULT 'DIRTY',
		deploy_sequence INTEGER,
		deploy_result TEXT,
		last_hash TEXT,
		last_config TEXT,
		UNIQUE(element_type, version)
	);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE UNIQUE INDEX IF NOT EXISTS agent_config_versions_u1 ON agent_config_versions(element_type, version);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE INDEX IF NOT EXISTS agent_config_versions_nu1 ON agent_config_versions(last_hash);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS agent_config_elements(
		id TEXT PRIMARY KEY,
		created_by TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_by TEXT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		element_id TEXT NOT NULL,
		element_type VARCHAR(120) NOT NULL,
		version_id TEXT NOT NULL
	);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE UNIQUE INDEX IF NOT EXISTS agent_config_elements_u1 ON agent_config_elements(version_id, element_id, element_type);`); err != nil {
		return err
	}

	return nil
}

func (migration *addAgents) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
