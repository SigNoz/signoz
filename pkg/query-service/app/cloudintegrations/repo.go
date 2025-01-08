package cloudintegrations

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type cloudProviderAccountsRepository interface {
	// list connected cloud provider accounts.
	listConnected(ctx context.Context, cloudProvider string) ([]AccountRecord, *model.ApiError)

	getByIds(ctx context.Context, cloudProvider string, ids []string) (map[string]*AccountRecord, *model.ApiError)

	get(ctx context.Context, cloudProvider string, id string) (*AccountRecord, *model.ApiError)

	// Insert an account or update it by ID for specified non-empty fields
	upsert(
		ctx context.Context,
		cloudProvider string,
		id *string,
		config *AccountConfig,
		cloudAccountId *string,
		agentReport *AgentReport,
		removedAt *time.Time,
	) (*AccountRecord, *model.ApiError)
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
			cloud_provider TEXT NOT NULL,
			id TEXT NOT NULL,
			config_json TEXT,
			cloud_account_id TEXT,
			last_agent_report_json TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
			removed_at TIMESTAMP,
			UNIQUE(cloud_provider, id)
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

func (r *cloudProviderAccountsSQLRepository) listConnected(
	ctx context.Context, cloudProvider string,
) ([]AccountRecord, *model.ApiError) {
	accounts := []AccountRecord{}

	err := r.db.SelectContext(
		ctx, &accounts, `
			select
				cloud_provider,
				id,
				config_json,
				cloud_account_id,
				last_agent_report_json,
				created_at,
				removed_at
			from cloud_integrations_accounts
      where
        cloud_provider=$1
        and removed_at is NULL
        and cloud_account_id is not NULL
        and last_agent_report_json is not NULL
			order by created_at
		`, cloudProvider,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query connected cloud accounts: %w", err,
		))
	}

	return accounts, nil
}

func (r *cloudProviderAccountsSQLRepository) getByIds(
	ctx context.Context, cloudProvider string, ids []string,
) (map[string]*AccountRecord, *model.ApiError) {
	accounts := []AccountRecord{}

	idPlaceholders := []string{}
	queryArgs := []any{cloudProvider}

	for _, id := range ids {
		idPlaceholders = append(idPlaceholders, "?")
		queryArgs = append(queryArgs, id)
	}

	err := r.db.SelectContext(
		ctx, &accounts, fmt.Sprintf(`
			select
				cloud_provider,
				id,
				config_json,
				cloud_account_id,
				last_agent_report_json,
				created_at,
				removed_at
			from cloud_integrations_accounts
			where
				cloud_provider=?
				and id in (%s)`,
			strings.Join(idPlaceholders, ", "),
		),
		queryArgs...,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query cloud provider account: %w", err,
		))
	}

	result := map[string]*AccountRecord{}
	for _, a := range accounts {

		if a.Config == nil {
			config := DefaultAccountConfig()
			a.Config = &config
		}

		result[a.Id] = &a
	}

	return result, nil
}

func (r *cloudProviderAccountsSQLRepository) get(
	ctx context.Context, cloudProvider string, id string,
) (*AccountRecord, *model.ApiError) {
	res, apiErr := r.getByIds(ctx, cloudProvider, []string{id})
	if apiErr != nil {
		return nil, apiErr
	}

	account := res[id]
	if account == nil {
		return nil, model.NotFoundError(fmt.Errorf(
			"couldn't find account with Id %s", id,
		))
	}

	return account, nil
}

func (r *cloudProviderAccountsSQLRepository) upsert(
	ctx context.Context,
	cloudProvider string,
	id *string,
	config *AccountConfig,
	cloudAccountId *string,
	agentReport *AgentReport,
	removedAt *time.Time,
) (*AccountRecord, *model.ApiError) {
	// Insert
	if id == nil {
		newId := uuid.NewString()
		id = &newId
	}

	// Prepare clause for setting values in `on conflict do update`
	onConflictSetStmts := []string{}
	updateColStmt := func(col string) string {
		return fmt.Sprintf("%s=excluded.%s", col, col)
	}

	if config != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, updateColStmt("config_json"),
		)
	}

	if cloudAccountId != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, updateColStmt("cloud_account_id"),
		)
	}

	if agentReport != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, updateColStmt("last_agent_report_json"),
		)
	}

	if removedAt != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, updateColStmt("removed_at"),
		)
	}

	onConflictClause := ""
	if len(onConflictSetStmts) > 0 {
		onConflictClause = fmt.Sprintf(
			"on conflict(cloud_provider, id) do update SET\n%s",
			strings.Join(onConflictSetStmts, ",\n"),
		)
	}

	insertQuery := fmt.Sprintf(`
    INSERT INTO cloud_integrations_accounts (
      cloud_provider,
      id,
      config_json,
      cloud_account_id,
      last_agent_report_json,
      removed_at
    ) values ($1, $2, $3, $4, $5, $6)
    %s`, onConflictClause,
	)

	_, dbErr := r.db.ExecContext(
		ctx, insertQuery,
		cloudProvider, id, config, cloudAccountId, agentReport, removedAt,
	)
	if dbErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not upsert cloud account record: %w", dbErr,
		))
	}

	upsertedAccount, apiErr := r.get(ctx, cloudProvider, *id)
	if apiErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't fetch upserted account by id: %w", apiErr.ToError(),
		))
	}

	return upsertedAccount, nil
}
