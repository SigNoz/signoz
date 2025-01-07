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
	// TODO(Raj): All methods should be scoped by cloud provider.
	listConnected(context.Context) ([]Account, *model.ApiError)

	getByIds(ctx context.Context, ids []string) (map[string]*Account, *model.ApiError)

	get(ctx context.Context, id string) (*Account, *model.ApiError)

	// Insert an account or update it by ID for specified non-empty fields
	upsert(
		ctx context.Context,
		id string,
		config *AccountConfig,
		cloudAccountId string,
		agentReport *AgentReport,
		removedAt *time.Time,
	) (*Account, *model.ApiError)
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

func (r *cloudProviderAccountsSQLRepository) listConnected(ctx context.Context) (
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
			from cloud_integrations_accounts
      where
        removed_at is NULL
        and cloud_account_id is not NULL
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

func (r *cloudProviderAccountsSQLRepository) getByIds(
	ctx context.Context, ids []string,
) (map[string]*Account, *model.ApiError) {
	accounts := []Account{}

	idPlaceholders := []string{}
	idValues := []interface{}{}
	for _, id := range ids {
		idPlaceholders = append(idPlaceholders, "?")
		idValues = append(idValues, id)
	}

	err := r.db.SelectContext(
		ctx, &accounts, fmt.Sprintf(`
			select
				id,
				config_json,
				cloud_account_id,
				last_agent_report_json,
				created_at,
				removed_at
			from cloud_integrations_accounts
			where id in (%s)`,
			strings.Join(idPlaceholders, ", "),
		),
		idValues...,
	)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query cloud provider account: %w", err,
		))
	}

	result := map[string]*Account{}
	for _, a := range accounts {
		result[a.Id] = &a
	}

	return result, nil
}

func (r *cloudProviderAccountsSQLRepository) get(
	ctx context.Context, id string,
) (*Account, *model.ApiError) {
	res, apiErr := r.getByIds(ctx, []string{id})
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
	id string,
	config *AccountConfig,
	cloudAccountId string,
	agentReport *AgentReport,
	removedAt *time.Time,
) (*Account, *model.ApiError) {
	// Insert
	if len(id) < 1 {
		// config must be specified when inserting
		if config == nil {
			return nil, model.BadRequest(fmt.Errorf("account config is required"))
		}

		id = uuid.NewString()
	}

	// Prepare clause for setting values in `on conflict do update`
	onConflictUpdates := []string{}
	updateColStmt := func(col string) string {
		return fmt.Sprintf("set %s=excluded.%s", col, col)
	}

	if config != nil {
		onConflictUpdates = append(
			onConflictUpdates, updateColStmt("config_json"),
		)
	}

	if len(cloudAccountId) > 0 {
		onConflictUpdates = append(
			onConflictUpdates, updateColStmt("cloud_account_id"),
		)
	}

	if agentReport != nil {
		onConflictUpdates = append(
			onConflictUpdates, updateColStmt("last_agent_report_json"),
		)
	}

	if removedAt != nil {
		onConflictUpdates = append(
			onConflictUpdates, updateColStmt("removed_at"),
		)
	}

	_, dbErr := r.db.ExecContext(
		ctx, fmt.Sprintf(`
			INSERT INTO cloud_integrations_accounts (
				id,
				config_json,
				cloud_account_id,
				last_agent_report_json,
				removed_at
			) values ($1, $2, $3, $4, $5)
			on conflict(id) do update
      %s
		`, strings.Join(onConflictUpdates, "\n")),
		id, config, cloudAccountId, agentReport, removedAt,
	)
	if dbErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not upsert cloud account record: %w", dbErr,
		))
	}

	upsertedAccount, apiErr := r.get(ctx, id)
	if apiErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't fetch upserted account by id: %w", apiErr.ToError(),
		))
	}

	return upsertedAccount, nil
}
