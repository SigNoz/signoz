package implcloudintegration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
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

func (store *store) GetConnectedAccount(ctx context.Context, orgID, id valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.StorableCloudIntegration, error) {
	account := new(cloudintegrationtypes.StorableCloudIntegration)
	err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		Model(account).
		Where("id = ?", id).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Where("account_id IS NOT NULL").
		Where("last_agent_report IS NOT NULL").
		Where("removed_at IS NULL").
		Scan(ctx)
	if err != nil {
		return nil, store.store.WrapNotFoundErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationNotFound, "connected cloud integration account with id %s not found", id)
	}
	return account, nil
}

func (store *store) GetConnectedAccountByProviderAccountID(ctx context.Context, orgID valuer.UUID, providerAccountID string, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.StorableCloudIntegration, error) {
	account := new(cloudintegrationtypes.StorableCloudIntegration)
	err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		Model(account).
		Where("account_id = ?", providerAccountID).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Where("last_agent_report IS NOT NULL").
		Where("removed_at IS NULL").
		Scan(ctx)
	if err != nil {
		return nil, store.store.WrapNotFoundErrf(err, cloudintegrationtypes.ErrCodeCloudIntegrationNotFound, "connected cloud integration account with provider account id %s not found", providerAccountID)
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

func (store *store) CountConnectedAccounts(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (int, error) {
	storable := new(cloudintegrationtypes.StorableCloudIntegration)
	count, err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		Model(storable).
		Where("org_id = ?", orgID).
		Where("provider = ?", provider).
		Where("removed_at IS NULL").
		Where("account_id IS NOT NULL").
		Where("last_agent_report IS NOT NULL").
		Count(ctx)
	if err != nil {
		return 0, err
	}

	return count, nil
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

func (store *store) ListSharedServices(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, cloudIntegrationID valuer.UUID) (map[cloudintegrationtypes.ServiceID][]*cloudintegrationtypes.StorableCloudIntegrationService, error) {
	// Subquery: service types that belong to the given account
	ownTypes := store.store.BunDBCtx(ctx).
		NewSelect().
		TableExpr("cloud_integration_service").
		ColumnExpr("type").
		Where("cloud_integration_id = ?", cloudIntegrationID)

	var services []*cloudintegrationtypes.StorableCloudIntegrationService
	err := store.
		store.
		BunDBCtx(ctx).
		NewSelect().
		TableExpr("cloud_integration_service AS cis").
		ColumnExpr("cis.*").
		Join("JOIN cloud_integration AS ci ON ci.id = cis.cloud_integration_id").
		Where("ci.org_id = ?", orgID).
		Where("ci.provider = ?", provider).
		Where("ci.removed_at IS NULL").
		Where("ci.account_id IS NOT NULL").
		Where("ci.last_agent_report IS NOT NULL").
		Where("cis.cloud_integration_id != ?", cloudIntegrationID).
		Where("cis.type IN (?)", ownTypes).
		Scan(ctx, &services)
	if err != nil {
		return nil, err
	}

	result := make(map[cloudintegrationtypes.ServiceID][]*cloudintegrationtypes.StorableCloudIntegrationService)
	for _, svc := range services {
		result[svc.Type] = append(result[svc.Type], svc)
	}
	return result, nil
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

func (store *store) DeleteServicesByCloudIntegrationID(ctx context.Context, orgID, cloudIntegrationID valuer.UUID) error {
	cte := store.store.BunDBCtx(ctx).
		NewSelect().
		TableExpr("cloud_integration_service AS cis_inner").
		ColumnExpr("cis_inner.id").
		Join("JOIN cloud_integration AS ci ON cis_inner.cloud_integration_id = ci.id").
		Where("ci.org_id = ?", orgID).
		Where("cis_inner.cloud_integration_id = ?", cloudIntegrationID)

	_, err := store.store.BunDBCtx(ctx).
		NewDelete().
		Model(new(cloudintegrationtypes.StorableCloudIntegrationService)).
		With("target", cte).
		Where("id IN (SELECT id FROM target)").
		Exec(ctx)
	return err
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

func (store *store) CreateIntegrationDashboard(ctx context.Context, integrationDashboard *cloudintegrationtypes.StorableIntegrationDashboard) error {
	_, err := store.store.BunDBCtx(ctx).NewInsert().Model(integrationDashboard).Exec(ctx)
	return err
}

func (store *store) GetIntegrationDashboardBySlug(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.IntegrationDashboardProviderType, slug string) (*cloudintegrationtypes.StorableIntegrationDashboard, error) {
	integrationDashboard := new(cloudintegrationtypes.StorableIntegrationDashboard)
	err := store.store.BunDBCtx(ctx).
		NewSelect().
		Model(integrationDashboard).
		Join("JOIN dashboard AS d ON storable_integration_dashboard.dashboard_id = d.id").
		Where("d.org_id = ?", orgID).
		Where("storable_integration_dashboard.provider = ?", provider).
		Where("storable_integration_dashboard.slug = ?", slug).
		Scan(ctx)
	if err != nil {
		return nil, store.store.WrapNotFoundErrf(err, errors.CodeNotFound, "integration dashboard with slug %s not found", slug)
	}
	return integrationDashboard, nil
}

func (store *store) ListIntegrationDashboardsBySlugPrefix(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.IntegrationDashboardProviderType, slugPrefix string) ([]*cloudintegrationtypes.StorableIntegrationDashboard, error) {
	var integrationDashboards []*cloudintegrationtypes.StorableIntegrationDashboard
	err := store.store.BunDBCtx(ctx).
		NewSelect().
		Model(&integrationDashboards).
		Join("JOIN dashboard AS d ON storable_integration_dashboard.dashboard_id = d.id").
		Where("d.org_id = ?", orgID).
		Where("storable_integration_dashboard.provider = ?", provider).
		Where("storable_integration_dashboard.slug LIKE ?", slugPrefix+"%").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return integrationDashboards, nil
}

func (store *store) DeleteIntegrationDashboardBySlug(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.IntegrationDashboardProviderType, slug string) error {
	cte := store.store.BunDBCtx(ctx).
		NewSelect().
		TableExpr("integration_dashboard AS id_inner").
		ColumnExpr("id_inner.id").
		Join("JOIN dashboard AS d ON id_inner.dashboard_id = d.id").
		Where("d.org_id = ?", orgID).
		Where("id_inner.provider = ?", provider).
		Where("id_inner.slug = ?", slug)

	_, err := store.store.BunDBCtx(ctx).
		NewDelete().
		Model(new(cloudintegrationtypes.StorableIntegrationDashboard)).
		With("target", cte).
		Where("id IN (SELECT id FROM target)").
		Exec(ctx)
	return err
}

func (store *store) RunInTx(ctx context.Context, cb func(ctx context.Context) error) error {
	return store.store.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		return cb(ctx)
	})
}
