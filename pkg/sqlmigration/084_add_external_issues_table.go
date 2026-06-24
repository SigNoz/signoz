package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addExternalIssuesTable struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddExternalIssuesTableFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_external_issues_table"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addExternalIssuesTable{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *addExternalIssuesTable) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addExternalIssuesTable) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Create external_issues table
	_, err = tx.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS external_issues (
			id TEXT PRIMARY KEY,
			alert_fingerprint TEXT NOT NULL,
			rule_id TEXT NOT NULL,
			rule_name TEXT,
			external_system TEXT NOT NULL,
			external_issue_id TEXT NOT NULL,
			external_issue_url TEXT,
			sync_status TEXT NOT NULL DEFAULT 'synced',
			last_synced_at TIMESTAMP NOT NULL,
			sync_error TEXT,
			metadata TEXT DEFAULT '{}',
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			org_id TEXT NOT NULL
		);
	`)
	if err != nil {
		return err
	}

	// Create indexes for efficient lookups
	_, err = tx.ExecContext(ctx, `
		CREATE INDEX IF NOT EXISTS idx_external_issues_external_id 
		ON external_issues(external_system, external_issue_id, org_id);
	`)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		CREATE INDEX IF NOT EXISTS idx_external_issues_alert_fingerprint 
		ON external_issues(alert_fingerprint, org_id);
	`)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		CREATE INDEX IF NOT EXISTS idx_external_issues_rule_id 
		ON external_issues(rule_id, org_id);
	`)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		CREATE INDEX IF NOT EXISTS idx_external_issues_org_id 
		ON external_issues(org_id);
	`)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (migration *addExternalIssuesTable) Down(ctx context.Context, db *bun.DB) error {
	// Rollback: drop table and indexes
	_, err := db.ExecContext(ctx, `DROP TABLE IF EXISTS external_issues;`)
	return err
}
