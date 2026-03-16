package implcloudintegration

import (
	"context"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type module struct {
	store        cloudintegrationtypes.Store
	userStore    types.UserStore
	licensing    licensing.Licensing
	zeus         zeus.Zeus
	gateway      gateway.Gateway
	globalConfig global.Config
	providers    map[cloudintegrationtypes.CloudProviderType]cloudintegration.CloudProvider
}

func NewModule(
	store cloudintegrationtypes.Store,
	sqlStore sqlstore.SQLStore,
	lic licensing.Licensing,
	z zeus.Zeus,
	gw gateway.Gateway,
	gc global.Config,
) cloudintegration.Module {
	return &module{
		store:        store,
		userStore:    impluser.NewStore(sqlStore, factory.ProviderSettings{}),
		licensing:    lic,
		zeus:         z,
		gateway:      gw,
		globalConfig: gc,
		providers:    map[cloudintegrationtypes.CloudProviderType]cloudintegration.CloudProvider{
			cloudintegrationtypes.CloudProviderTypeAWS:   &awsProvider{},
			cloudintegrationtypes.CloudProviderTypeAzure: &azureProvider{},
		},
	}
}

func (m *module) CreateConnectionArtifact(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, request *cloudintegrationtypes.ConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	p, ok := m.providers[provider]
	if !ok {
		return nil, errors.NewInvalidInputf(cloudintegrationtypes.ErrCodeCloudProviderInvalidInput, "unsupported cloud provider: %s", provider.StringValue())
	}

	creds, err := m.resolveCredentials(ctx, orgID, provider)
	if err != nil {
		return nil, err
	}

	newAccountID := valuer.GenerateUUID()

	artifact, err := p.CreateArtifact(ctx, orgID, request, creds, newAccountID)
	if err != nil {
		return nil, err
	}

	account := &cloudintegrationtypes.StorableCloudIntegration{
		Identifiable: types.Identifiable{ID: newAccountID},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Provider: provider,
		OrgID:    orgID,
	}

	if err := m.store.UpsertAccount(ctx, account); err != nil {
		return nil, err
	}

	return artifact, nil
}

func (m *module) resolveCredentials(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (cloudintegration.Credentials, error) {
	creds := cloudintegration.Credentials{}

	pat, err := m.getOrCreateIntegrationPAT(ctx, orgID, provider)
	if err != nil {
		return creds, err
	}
	creds.SigNozAPIKey = pat

	if m.licensing == nil {
		return creds, nil
	}

	license, err := m.licensing.GetActive(ctx, orgID)
	if err != nil {
		return creds, err
	}

	if license == nil {
		return creds, nil
	}

	respBytes, err := m.zeus.GetDeployment(ctx, license.Key)
	if err != nil {
		return creds, errors.NewInternalf(errors.CodeInternal, "couldn't query deployment info: %v", err)
	}

	deployment, err := zeustypes.NewGettableDeployment(respBytes)
	if err != nil {
		return creds, err
	}
	creds.SigNozAPIUrl = deployment.SignozAPIUrl

	if m.globalConfig.IngestionURL != nil {
		creds.IngestionUrl = m.globalConfig.IngestionURL.String()
	}

	if m.gateway != nil {
		ingestionKeyName := fmt.Sprintf("%s-integration", provider.StringValue())
		ingestionKey, err := m.getOrCreateIngestionKey(ctx, orgID, ingestionKeyName)
		if err != nil {
			return creds, err
		}
		creds.IngestionKey = ingestionKey
	}

	return creds, nil
}

func (m *module) getOrCreateIngestionKey(ctx context.Context, orgID valuer.UUID, keyName string) (string, error) {
	result, err := m.gateway.SearchIngestionKeysByName(ctx, orgID, keyName, 1, 10)
	if err != nil {
		return "", errors.NewInternalf(errors.CodeInternal, "couldn't search ingestion keys: %v", err)
	}

	for _, k := range result.Keys {
		if k.Name == keyName {
			return k.Value, nil
		}
	}

	created, err := m.gateway.CreateIngestionKey(ctx, orgID, keyName, []string{"integration"}, time.Time{})
	if err != nil {
		return "", errors.NewInternalf(errors.CodeInternal, "couldn't create ingestion key: %v", err)
	}

	return created.Value, nil
}

func (m *module) getOrCreateIntegrationPAT(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (string, error) {
	integrationPATName := fmt.Sprintf("%s integration", provider.StringValue())

	integrationUser, err := m.getOrCreateIntegrationUser(ctx, orgID, provider)
	if err != nil {
		return "", err
	}

	allPATs, err := m.userStore.ListAPIKeys(ctx, orgID)
	if err != nil {
		return "", errors.NewInternalf(errors.CodeInternal, "couldn't list PATs: %v", err)
	}

	for _, p := range allPATs {
		if p.UserID == integrationUser.ID && p.Name == integrationPATName {
			return p.Token, nil
		}
	}

	newPAT, err := types.NewStorableAPIKey(
		integrationPATName,
		integrationUser.ID,
		types.RoleViewer,
		0,
	)
	if err != nil {
		return "", errors.NewInternalf(errors.CodeInternal, "couldn't create cloud integration PAT: %v", err)
	}

	if err := m.userStore.CreateAPIKey(ctx, newPAT); err != nil {
		return "", errors.NewInternalf(errors.CodeInternal, "couldn't persist cloud integration PAT: %v", err)
	}

	return newPAT.Token, nil
}

func (m *module) getOrCreateIntegrationUser(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*types.User, error) {
	cloudIntegrationUserName := fmt.Sprintf("%s-integration", provider.StringValue())
	email := valuer.MustNewEmail(fmt.Sprintf("%s@signoz.io", cloudIntegrationUserName))

	existingUsers, err := m.userStore.GetUsersByEmailAndOrgID(ctx, email, orgID)
	if err != nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "couldn't look up integration user: %v", err)
	}

	for _, u := range existingUsers {
		if u.Status != types.UserStatusDeleted {
			return u, nil
		}
	}

	cloudIntegrationUser, err := types.NewUser(cloudIntegrationUserName, email, types.RoleViewer, orgID, types.UserStatusActive)
	if err != nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "couldn't construct integration user: %v", err)
	}

	password := types.MustGenerateFactorPassword(cloudIntegrationUser.ID.StringValue())

	if err := m.userStore.CreateUser(ctx, cloudIntegrationUser); err != nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "couldn't create integration user: %v", err)
	}

	if err := m.userStore.CreatePassword(ctx, password); err != nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "couldn't create integration user password: %v", err)
	}

	return cloudIntegrationUser, nil
}

func (m *module) GetAccountStatus(_ context.Context, _, _ valuer.UUID) (*cloudintegrationtypes.AccountStatus, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) ListConnectedAccounts(_ context.Context, _ valuer.UUID) (*cloudintegrationtypes.ConnectedAccounts, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) DisconnectAccount(_ context.Context, _, _ valuer.UUID) error {
	return errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) UpdateAccountConfig(_ context.Context, _, _ valuer.UUID, _ *cloudintegrationtypes.UpdateAccountConfigRequest) (*cloudintegrationtypes.Account, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) ListServicesSummary(_ context.Context, _ valuer.UUID, _ *valuer.UUID) (*cloudintegrationtypes.ServicesSummary, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) GetService(_ context.Context, _ valuer.UUID, _ string, _ *valuer.UUID) (*cloudintegrationtypes.Service, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) UpdateServiceConfig(_ context.Context, _ string, _ valuer.UUID, _ *cloudintegrationtypes.UpdateServiceConfigRequest) (*cloudintegrationtypes.ServiceSummary, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) AgentCheckIn(_ context.Context, _ valuer.UUID, _ *cloudintegrationtypes.AgentCheckInRequest) (cloudintegrationtypes.AgentCheckInResponse, error) {
	return cloudintegrationtypes.AgentCheckInResponse{}, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) GetDashboardByID(_ context.Context, _ string, _ valuer.UUID) (*dashboardtypes.Dashboard, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}

func (m *module) GetAllDashboards(_ context.Context, _ valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "not implemented")
}