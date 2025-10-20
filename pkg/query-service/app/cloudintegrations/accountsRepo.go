package cloudintegrations

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type cloudProviderAccountsRepository interface {
	listConnected(ctx context.Context, orgId string, provider string) ([]types.CloudIntegration, *model.ApiError)

	get(ctx context.Context, orgId string, provider string, id string) (*types.CloudIntegration, *model.ApiError)

	getConnectedCloudAccount(ctx context.Context, orgId string, provider string, accountID string) (*types.CloudIntegration, *model.ApiError)

	// Insert an account or update it by (cloudProvider, id)
	// for specified non-empty fields
	upsert(
		ctx context.Context,
		orgId string,
		provider string,
		id *string,
		config *types.AccountConfig,
		accountId *string,
		agentReport *types.AgentReport,
		removedAt *time.Time,
	) (*types.CloudIntegration, *model.ApiError)
}

func newCloudProviderAccountsRepository(store sqlstore.SQLStore) (
	*cloudProviderAccountsSQLRepository, error,
) {
	return &cloudProviderAccountsSQLRepository{
		store: store,
	}, nil
}

type cloudProviderAccountsSQLRepository struct {
	store sqlstore.SQLStore
}

func (r *cloudProviderAccountsSQLRepository) listConnected(
	ctx context.Context, orgId string, cloudProvider string,
) ([]types.CloudIntegration, *model.ApiError) {
	accounts := []types.CloudIntegration{}

	err := r.store.BunDB().NewSelect().
		Model(&accounts).
		Where("org_id = ?", orgId).
		Where("provider = ?", cloudProvider).
		Where("removed_at is NULL").
		Where("account_id is not NULL").
		Where("last_agent_report is not NULL").
		Order("created_at").
		Scan(ctx)

	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not query connected cloud accounts: %w", err,
		))
	}

	return accounts, nil
}

func (r *cloudProviderAccountsSQLRepository) get(
	ctx context.Context, orgId string, provider string, id string,
) (*types.CloudIntegration, *model.ApiError) {
	var result types.CloudIntegration

	err := r.store.BunDB().NewSelect().
		Model(&result).
		Where("org_id = ?", orgId).
		Where("provider = ?", provider).
		Where("id = ?", id).
		Scan(ctx)

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
	ctx context.Context, orgId string, provider string, accountId string,
) (*types.CloudIntegration, *model.ApiError) {
	var result types.CloudIntegration

	err := r.store.BunDB().NewSelect().
		Model(&result).
		Where("org_id = ?", orgId).
		Where("provider = ?", provider).
		Where("account_id = ?", accountId).
		Where("last_agent_report is not NULL").
		Where("removed_at is NULL").
		Scan(ctx)

	if err == sql.ErrNoRows {
		return nil, model.NotFoundError(fmt.Errorf(
			"couldn't find connected cloud account %s", accountId,
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
	orgId string,
	provider string,
	id *string,
	config *types.AccountConfig,
	accountId *string,
	agentReport *types.AgentReport,
	removedAt *time.Time,
) (*types.CloudIntegration, *model.ApiError) {
	// Insert
	if id == nil {
		temp := valuer.GenerateUUID().StringValue()
		id = &temp
	}

	// Prepare clause for setting values in `on conflict do update`
	onConflictSetStmts := []string{}
	setColStatement := func(col string) string {
		return fmt.Sprintf("%s=excluded.%s", col, col)
	}

	if config != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, setColStatement("config"),
		)
	}

	if accountId != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, setColStatement("account_id"),
		)
	}

	if agentReport != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, setColStatement("last_agent_report"),
		)
	}

	if removedAt != nil {
		onConflictSetStmts = append(
			onConflictSetStmts, setColStatement("removed_at"),
		)
	}

	// set updated_at to current timestamp if it's an upsert
	onConflictSetStmts = append(
		onConflictSetStmts, setColStatement("updated_at"),
	)

	onConflictClause := ""
	if len(onConflictSetStmts) > 0 {
		onConflictClause = fmt.Sprintf(
			"conflict(id, provider, org_id) do update SET\n%s",
			strings.Join(onConflictSetStmts, ",\n"),
		)
	}

	integration := types.CloudIntegration{
		OrgID:        orgId,
		Provider:     provider,
		Identifiable: types.Identifiable{ID: valuer.MustNewUUID(*id)},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Config:          config,
		AccountID:       accountId,
		LastAgentReport: agentReport,
		RemovedAt:       removedAt,
	}

	_, dbErr := r.store.BunDB().NewInsert().
		Model(&integration).
		On(onConflictClause).
		Exec(ctx)

	if dbErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"could not upsert cloud account record: %w", dbErr,
		))
	}

	upsertedAccount, apiErr := r.get(ctx, orgId, provider, *id)
	if apiErr != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't fetch upserted account by id: %w", apiErr.ToError(),
		))
	}

	return upsertedAccount, nil
}
