package implcloudintegration

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	cloudintegrationtypes "github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var ErrCodeCloudIntegrationAccountNotFound = errors.MustNewCode("cloud_integration_account_not_found")

// cloudProviderAccountsSQLRepository is a SQL-backed implementation of CloudIntegrationAccountStore.
type cloudProviderAccountsSQLRepository struct {
	store sqlstore.SQLStore
}

// NewSQLCloudIntegrationAccountStore constructs a SQL-backed CloudIntegrationAccountStore.
func NewSQLCloudIntegrationAccountStore(store sqlstore.SQLStore) cloudintegrationtypes.CloudIntegrationAccountStore {
	return &cloudProviderAccountsSQLRepository{store: store}
}

// -----------------------------
// Account store implementation
// -----------------------------

func (r *cloudProviderAccountsSQLRepository) ListConnected(
	ctx context.Context, orgId string, cloudProvider string,
) ([]cloudintegrationtypes.CloudIntegration, error) {
	accounts := []cloudintegrationtypes.CloudIntegration{}

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
		slog.ErrorContext(ctx, "error querying connected cloud accounts", "error", err)
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not query connected cloud accounts")
	}

	return accounts, nil
}

func (r *cloudProviderAccountsSQLRepository) Get(
	ctx context.Context, orgId string, provider string, id string,
) (*cloudintegrationtypes.CloudIntegration, error) {
	var result cloudintegrationtypes.CloudIntegration

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
				ErrCodeCloudIntegrationAccountNotFound,
				"couldn't find account with Id %s", id,
			)
		}

		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't query cloud provider account")
	}

	return &result, nil
}

func (r *cloudProviderAccountsSQLRepository) GetConnectedCloudAccount(
	ctx context.Context, orgId string, provider string, accountId string,
) (*cloudintegrationtypes.CloudIntegration, error) {
	var result cloudintegrationtypes.CloudIntegration

	err := r.store.BunDB().NewSelect().
		Model(&result).
		Where("org_id = ?", orgId).
		Where("provider = ?", provider).
		Where("account_id = ?", accountId).
		Where("last_agent_report is not NULL").
		Where("removed_at is NULL").
		Scan(ctx)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.WrapNotFoundf(err, ErrCodeCloudIntegrationAccountNotFound, "couldn't find connected cloud account %s", accountId)
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
	agentReport *cloudintegrationtypes.AgentReport,
	removedAt *time.Time,
) (*cloudintegrationtypes.CloudIntegration, error) {
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

	integration := cloudintegrationtypes.CloudIntegration{
		OrgID:        orgId,
		Provider:     provider,
		Identifiable: types.Identifiable{ID: valuer.MustNewUUID(*id)},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Config:          string(config),
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
		slog.ErrorContext(ctx, "error upserting cloud integration account", "error", err)
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't get upserted cloud integration account")
	}

	return upsertedAccount, nil
}
