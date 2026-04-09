package implcloudintegration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type store struct {
	store sqlstore.SQLStore
}

func NewStore(sqlStore sqlstore.SQLStore) cloudintegrationtypes.Store {
	return &store{store: sqlStore}
}

func (store *store) GetAccountByID(ctx context.Context, orgID, id valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.StorableCloudIntegration, error) {
	account := new(cloudintegrationtypes.StorableCloudIntegration)
	err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		Model(account).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Scan(ctx)
	if err != nil {
		return nil, store.store.WrapNotFoundErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationNotFound, "cloud integration account with id %s not found", id)
	}
	return account, nil
}

func (store *store) GetConnectedAccount(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, providerAccountID string) (*cloudintegrationtypes.StorableCloudIntegration, error) {
	account := new(cloudintegrationtypes.StorableCloudIntegration)
	err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		Model(account).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Where("account_id = ?", providerAccountID).
		Where("last_agent_report IS NOT NULL").
		Where("removed_at IS NULL").
		Scan(ctx)
	if err != nil {
		return nil, store.store.WrapNotFoundErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationNotFound, "connected account with provider account id %s not found", providerAccountID)
	}
	return account, nil
}

func (store *store) ListConnectedAccounts(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) ([]*cloudintegrationtypes.StorableCloudIntegration, error) {
	var accounts []*cloudintegrationtypes.StorableCloudIntegration
	err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		Model(&accounts).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Where("removed_at IS NULL").
		Where("account_id IS NOT NULL").
		Where("last_agent_report IS NOT NULL").
		Order("created_at ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return accounts, nil
}

func (store *store) CreateAccount(ctx context.Context, account *cloudintegrationtypes.StorableCloudIntegration) error {
	_, err := store.
		store.
		BunDBCtx(ctx).
		NewInsert().
		Model(account).
		Exec(ctx)
	if err != nil {
		return store.store.WrapAlreadyExistsErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationAlreadyExists, "cloud integration account with id %s already exists", account.ID)
	}

	return nil
}

func (store *store) UpdateAccount(ctx context.Context, account *cloudintegrationtypes.StorableCloudIntegration) error {
	_, err := store.
		store.
		BunDBCtx(ctx).
		NewUpdate().
		Model(account).
		WherePK().
		Where("org_id = ?", account.OrgID).
		Where("provider = ?", account.Provider).
		Exec(ctx)

	return err
}

func (store *store) RemoveAccount(ctx context.Context, orgID, id valuer.UUID, provider cloudintegrationtypes.CloudProviderType) error {
	_, err := store.
		store.
		BunDBCtx(ctx).
		NewUpdate().
		Model(new(cloudintegrationtypes.StorableCloudIntegration)).
		Set("removed_at = ?", time.Now()).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Exec(ctx)
	return err
}

func (store *store) GetServiceByServiceID(ctx context.Context, cloudIntegrationID valuer.UUID, serviceID cloudintegrationtypes.ServiceID) (*cloudintegrationtypes.StorableCloudIntegrationService, error) {
	service := new(cloudintegrationtypes.StorableCloudIntegrationService)
	err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		Model(service).
		Where("cloud_integration_id = ?", cloudIntegrationID).
		Where("type = ?", serviceID).
		Scan(ctx)
	if err != nil {
		return nil, store.store.WrapNotFoundErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationServiceNotFound, "cloud integration service with id %s not found", serviceID)
	}
	return service, nil
}

func (store *store) ListServices(ctx context.Context, cloudIntegrationID valuer.UUID) ([]*cloudintegrationtypes.StorableCloudIntegrationService, error) {
	var services []*cloudintegrationtypes.StorableCloudIntegrationService
	err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		Model(&services).
		Where("cloud_integration_id = ?", cloudIntegrationID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return services, nil
}

func (store *store) CreateService(ctx context.Context, service *cloudintegrationtypes.StorableCloudIntegrationService) error {
	_, err := store.
		store.
		BunDBCtx(ctx).
		NewInsert().
		Model(service).
		Exec(ctx)
	if err != nil {
		return store.store.WrapAlreadyExistsErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationServiceAlreadyExists, "cloud integration service with id %s already exists for integration account", service.Type)
	}

	return nil
}

func (store *store) UpdateService(ctx context.Context, service *cloudintegrationtypes.StorableCloudIntegrationService) error {
	_, err := store.
		store.
		BunDBCtx(ctx).
		NewUpdate().
		Model(service).
		WherePK().
		Where("cloud_integration_id = ?", service.CloudIntegrationID).
		Where("type = ?", service.Type).
		Exec(ctx)
	return err
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.store.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}
