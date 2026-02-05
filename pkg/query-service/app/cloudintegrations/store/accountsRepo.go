package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/integrationstypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	CodeCloudIntegrationAccountNotFound errors.Code = errors.MustNewCode("cloud_integration_account_not_found")
)

type CloudProviderAccountsRepository interface {
	ListConnected(ctx context.Context, orgId string, provider string) ([]integrationstypes.CloudIntegration, error)

	Get(ctx context.Context, orgId string, provider string, id string) (*integrationstypes.CloudIntegration, error)

	GetConnectedCloudAccount(ctx context.Context, orgId string, provider string, accountID string) (*integrationstypes.CloudIntegration, error)

	// Insert an account or update it by (cloudProvider, id)
	// for specified non-empty fields
	Upsert(
		ctx context.Context,
		orgId string,
		provider string,
		id *string,
		config []byte,
		accountId *string,
		agentReport *integrationstypes.AgentReport,
		removedAt *time.Time,
	) (*integrationstypes.CloudIntegration, error)
}

func NewCloudProviderAccountsRepository(store sqlstore.SQLStore) CloudProviderAccountsRepository {
	return &cloudProviderAccountsSQLRepository{store: store}
}

type cloudProviderAccountsSQLRepository struct {
	store sqlstore.SQLStore
}

func (r *cloudProviderAccountsSQLRepository) ListConnected(
	ctx context.Context, orgId string, cloudProvider string,
) ([]integrationstypes.CloudIntegration, error) {
	accounts := []integrationstypes.CloudIntegration{}

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
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not query connected cloud accounts")
	}

	return accounts, nil
}

func (r *cloudProviderAccountsSQLRepository) Get(
	ctx context.Context, orgId string, provider string, id string,
) (*integrationstypes.CloudIntegration, error) {
	var result integrationstypes.CloudIntegration

	err := r.store.BunDB().NewSelect().
		Model(&result).
		Where("org_id = ?", orgId).
		Where("provider = ?", provider).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.WrapNotFoundf(
				err,
				CodeCloudIntegrationAccountNotFound,
				"couldn't find account with Id %s", id,
			)
		}

		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't query cloud provider account")
	}

	return &result, nil
}

func (r *cloudProviderAccountsSQLRepository) GetConnectedCloudAccount(
	ctx context.Context, orgId string, provider string, accountId string,
) (*integrationstypes.CloudIntegration, error) {
	var result integrationstypes.CloudIntegration

	err := r.store.BunDB().NewSelect().
		Model(&result).
		Where("org_id = ?", orgId).
		Where("provider = ?", provider).
		Where("account_id = ?", accountId).
		Where("last_agent_report is not NULL").
		Where("removed_at is NULL").
		Scan(ctx)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.WrapNotFoundf(err, CodeCloudIntegrationAccountNotFound, "couldn't find connected cloud account %s", accountId)
	} else if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't query cloud provider account")
	}

	return &result, nil
}

func (r *cloudProviderAccountsSQLRepository) Upsert(
	ctx context.Context,
	orgId string,
	provider string,
	id *string,
	config []byte,
	accountId *string,
	agentReport *integrationstypes.AgentReport,
	removedAt *time.Time,
) (*integrationstypes.CloudIntegration, error) {
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

	integration := integrationstypes.CloudIntegration{
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

	_, err := r.store.BunDB().NewInsert().
		Model(&integration).
		On(onConflictClause).
		Exec(ctx)

	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't upsert cloud integration account")
	}

	upsertedAccount, err := r.Get(ctx, orgId, provider, *id)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't get upserted cloud integration account")
	}

	return upsertedAccount, nil
}
