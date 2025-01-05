package cloudintegrations

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type cloudProviderAccountsRepository interface {
	listConnectedAccounts(context.Context) ([]Account, *model.ApiError)
}

func newCloudProviderAccountsRepository(db *sqlx.DB) (
	*cloudProviderAccountsSQLRepository, error,
) {
	if err := InitSqliteDBIfNeeded(db); err != nil {
		return nil, fmt.Errorf("could not init sqlite DB for cloudintegrations: %w", err)
	}

	return &cloudProviderAccountsSQLRepository{
		db: db,
	}, nil
}

func InitSqliteDBIfNeeded(db *sqlx.DB) error {
	if db == nil {
		return fmt.Errorf("db is required")
	}

	createTablesStatements := `
		CREATE TABLE IF NOT EXISTS cloud_integrations_accounts(
			id TEXT PRIMARY KEY NOT NULL,
			config_json TEXT NOT NULL,
			cloud_account_id TEXT,
			last_agent_report_json TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
			removed_at TIMESTAMP
		)
	`
	_, err := db.Exec(createTablesStatements)
	if err != nil {
		return fmt.Errorf(
			"could not ensure cloud provider integrations schema in sqlite DB: %w", err,
		)
	}

	return nil
}

type cloudProviderAccountsSQLRepository struct {
	db *sqlx.DB
}

func (r *cloudProviderAccountsSQLRepository) listConnectedAccounts(ctx context.Context) (
	[]Account, *model.ApiError,
) {
	accounts := []Account{}

	err := r.db.SelectContext(
		ctx, &accounts, `
			select
				id,
				config_json,
				cloud_account_id,
				last_agent_report_json,
				created_at,
				removed_at
			from  cloud_integrations_accounts
			order by created_at
		`,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query connected cloud accounts: %w", err,
		))
	}

	return accounts, nil
}
