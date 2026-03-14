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

func (s *store) GetAccountByID(ctx context.Context, orgID, id valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.StorableCloudIntegration, error) {
	account := new(cloudintegrationtypes.StorableCloudIntegration)
	err := s.store.BunDB().NewSelect().Model(account).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Scan(ctx)
	if err != nil {
		return nil, s.store.WrapNotFoundErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationNotFound, "cloud integration account with id %s not found", id)
	}
	return account, nil
}

func (s *store) UpsertAccount(ctx context.Context, account *cloudintegrationtypes.StorableCloudIntegration) error {
	account.UpdatedAt = time.Now()
	_, err := s.store.BunDBCtx(ctx).NewInsert().Model(account).
		On("CONFLICT (id, provider, org_id) DO UPDATE").
		Set("config = EXCLUDED.config").
		Set("account_id = EXCLUDED.account_id").
		Set("last_agent_report = EXCLUDED.last_agent_report").
		Set("removed_at = EXCLUDED.removed_at").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	return err
}

func (s *store) RemoveAccount(ctx context.Context, orgID, id valuer.UUID, provider cloudintegrationtypes.CloudProviderType) error {
	_, err := s.store.BunDBCtx(ctx).NewUpdate().Model((*cloudintegrationtypes.StorableCloudIntegration)(nil)).
		Set("removed_at = ?", time.Now()).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Exec(ctx)
	return err
}

func (s *store) GetConnectedAccounts(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) ([]*cloudintegrationtypes.StorableCloudIntegration, error) {
	var accounts []*cloudintegrationtypes.StorableCloudIntegration
	err := s.store.BunDB().NewSelect().Model(&accounts).
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

func (s *store) GetConnectedAccount(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, providerAccountID string) (*cloudintegrationtypes.StorableCloudIntegration, error) {
	account := new(cloudintegrationtypes.StorableCloudIntegration)
	err := s.store.BunDB().NewSelect().Model(account).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Where("account_id = ?", providerAccountID).
		Where("last_agent_report IS NOT NULL").
		Where("removed_at IS NULL").
		Scan(ctx)
	if err != nil {
		return nil, s.store.WrapNotFoundErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationNotFound, "connected account with provider account id %s not found", providerAccountID)
	}
	return account, nil
}

func (s *store) GetServiceByType(ctx context.Context, cloudIntegrationID valuer.UUID, serviceType string) (*cloudintegrationtypes.StorableCloudIntegrationService, error) {
	service := new(cloudintegrationtypes.StorableCloudIntegrationService)
	err := s.store.BunDB().NewSelect().Model(service).
		Where("cloud_integration_id = ?", cloudIntegrationID).
		Where("type = ?", serviceType).
		Scan(ctx)
	if err != nil {
		return nil, s.store.WrapNotFoundErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationNotFound, "cloud integration service with type %s not found", serviceType)
	}
	return service, nil
}

func (s *store) UpsertService(ctx context.Context, service *cloudintegrationtypes.StorableCloudIntegrationService) error {
	service.UpdatedAt = time.Now()
	_, err := s.store.BunDBCtx(ctx).NewInsert().Model(service).
		On("CONFLICT (cloud_integration_id, type) DO UPDATE").
		Set("config = EXCLUDED.config").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	return err
}

func (s *store) GetServices(ctx context.Context, cloudIntegrationID valuer.UUID) ([]*cloudintegrationtypes.StorableCloudIntegrationService, error) {
	var services []*cloudintegrationtypes.StorableCloudIntegrationService
	err := s.store.BunDB().NewSelect().Model(&services).
		Where("cloud_integration_id = ?", cloudIntegrationID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return services, nil
}
