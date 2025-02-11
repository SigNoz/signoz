package cloudintegrations

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type cloudProviderAccountsRepository interface {
	listConnected(ctx context.Context, cloudProvider string) ([]AccountRecord, *model.ApiError)

	get(ctx context.Context, cloudProvider string, id string) (*AccountRecord, *model.ApiError)

	getConnectedCloudAccount(
		ctx context.Context, cloudProvider string, cloudAccountId string,
	) (*AccountRecord, *model.ApiError)

	// Insert an account or update it by (cloudProvider, id)
	// for specified non-empty fields
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
	return &cloudProviderAccountsSQLRepository{
		db: db,
	}, nil
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

func (r *cloudProviderAccountsSQLRepository) get(
	ctx context.Context, cloudProvider string, id string,
) (*AccountRecord, *model.ApiError) {
	var result AccountRecord

	err := r.db.GetContext(
		ctx, &result, `
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
				and id=$2
		`,
		cloudProvider, id,
	)

	if err == sql.ErrNoRows {
		return nil, model.NotFoundError(fmt.Errorf(
			"couldn't find account with Id %s", id,
		))
	} else if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't query cloud provider accounts: %w", err,
		))
	}

	return &result, nil
}

func (r *cloudProviderAccountsSQLRepository) getConnectedCloudAccount(
	ctx context.Context, cloudProvider string, cloudAccountId string,
) (*AccountRecord, *model.ApiError) {
	var result AccountRecord

	err := r.db.GetContext(
		ctx, &result, `
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
				and cloud_account_id=$2
				and last_agent_report_json is not NULL
				and removed_at is NULL
		`,
		cloudProvider, cloudAccountId,
	)

	if err == sql.ErrNoRows {
		return nil, model.NotFoundError(fmt.Errorf(
			"couldn't find connected cloud account %s", cloudAccountId,
		))
	} else if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't query cloud provider accounts: %w", err,
		))
	}

	return &result, nil
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
	setColStatement := func(col string) string {
		return fmt.Sprintf("%s=excluded.%s", col, col)
	}

	if config != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, setColStatement("config_json"),
		)
	}

	if cloudAccountId != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, setColStatement("cloud_account_id"),
		)
	}

	if agentReport != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, setColStatement("last_agent_report_json"),
		)
	}

	if removedAt != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, setColStatement("removed_at"),
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
