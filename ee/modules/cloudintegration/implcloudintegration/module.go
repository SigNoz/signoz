package implcloudintegration

import (
	"context"
	"time"

	"github.com/SigNoz/signoz/ee/modules/cloudintegration/implcloudintegration/implcloudprovider"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type module struct {
	userGetter        user.Getter
	userSetter        user.Setter
	store             cloudintegrationtypes.Store
	gateway           gateway.Gateway
	zeus              zeus.Zeus
	licensing         licensing.Licensing
	globalConfig      global.Config
	cloudProvidersMap map[cloudintegrationtypes.CloudProviderType]cloudintegration.CloudProviderModule
}

func NewModule(
	store cloudintegrationtypes.Store,
	globalConfig global.Config,
	zeus zeus.Zeus,
	gateway gateway.Gateway,
	licensing licensing.Licensing,
	userGetter user.Getter,
	userSetter user.Setter,
) cloudintegration.Module {
	awsCloudProviderModule := implcloudprovider.NewAWSCloudProvider()
	azureCloudProviderModule := implcloudprovider.NewAzureCloudProvider()
	cloudProvidersMap := map[cloudintegrationtypes.CloudProviderType]cloudintegration.CloudProviderModule{
		cloudintegrationtypes.CloudProviderTypeAWS:   awsCloudProviderModule,
		cloudintegrationtypes.CloudProviderTypeAzure: azureCloudProviderModule,
	}

	return &module{
		store:             store,
		globalConfig:      globalConfig,
		zeus:              zeus,
		gateway:           gateway,
		licensing:         licensing,
		userGetter:        userGetter,
		userSetter:        userSetter,
		cloudProvidersMap: cloudProvidersMap,
	}
}

func (module *module) CreateAccount(ctx context.Context, account *cloudintegrationtypes.Account) error {
	_, err := module.licensing.GetActive(ctx, account.OrgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storableCloudIntegration, err := cloudintegrationtypes.NewStorableCloudIntegration(account)
	if err != nil {
		return err
	}

	return module.store.CreateAccount(ctx, storableCloudIntegration)
}

func (module *module) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.ConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	// TODO: evaluate if this check is really required and remove if the deployment promises to always have this configured.
	if module.globalConfig.IngestionURL == nil {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "ingestion URL is not configured")
	}

	// get license to get the deployment details
	license, err := module.licensing.GetActive(ctx, account.OrgID)
	if err != nil {
		return nil, err
	}

	// get deployment details from zeus
	respBytes, err := module.zeus.GetDeployment(ctx, license.Key)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't get deployment")
	}

	// parse deployment details
	deployment, err := zeustypes.NewGettableDeployment(respBytes)
	if err != nil {
		return nil, err
	}

	apiKey, err := module.getOrCreateAPIKey(ctx, account.OrgID, account.Provider)
	if err != nil {
		return nil, err
	}

	ingestionKey, err := module.getOrCreateIngestionKey(ctx, account.OrgID, account.Provider)
	if err != nil {
		return nil, err
	}

	creds := &cloudintegrationtypes.SignozCredentials{
		SigNozAPIURL: deployment.SignozAPIUrl,
		SigNozAPIKey: apiKey,
		IngestionURL: module.globalConfig.IngestionURL.String(),
		IngestionKey: ingestionKey,
	}

	cloudProviderModule, err := module.GetCloudProvider(account.Provider)
	if err != nil {
		return nil, err
	}

	return cloudProviderModule.GetConnectionArtifact(ctx, creds, account, req)
}

func (module *module) GetAccount(ctx context.Context, orgID valuer.UUID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.Account, error) {
	panic("unimplemented")
}

func (module *module) AgentCheckIn(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, req *cloudintegrationtypes.AgentCheckInRequest) (*cloudintegrationtypes.AgentCheckInResponse, error) {
	panic("unimplemented")
}

func (module *module) CreateService(ctx context.Context, orgID valuer.UUID, service *cloudintegrationtypes.CloudIntegrationService) error {
	panic("unimplemented")
}

func (module *module) DisconnectAccount(ctx context.Context, orgID valuer.UUID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) error {
	panic("unimplemented")
}

func (module *module) GetDashboardByID(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error) {
	panic("unimplemented")
}

func (module *module) GetService(ctx context.Context, orgID valuer.UUID, integrationID *valuer.UUID, serviceID string) (*cloudintegrationtypes.Service, error) {
	panic("unimplemented")
}

func (module *module) ListAccounts(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) ([]*cloudintegrationtypes.Account, error) {
	panic("unimplemented")
}

func (module *module) ListDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	panic("unimplemented")
}

func (module *module) ListServicesMetadata(ctx context.Context, orgID valuer.UUID, integrationID *valuer.UUID) ([]*cloudintegrationtypes.ServiceMetadata, error) {
	panic("unimplemented")
}

func (module *module) UpdateAccount(ctx context.Context, account *cloudintegrationtypes.Account) error {
	panic("unimplemented")
}

func (module *module) UpdateService(ctx context.Context, orgID valuer.UUID, service *cloudintegrationtypes.CloudIntegrationService) error {
	panic("unimplemented")
}

func (m *module) GetCloudProvider(provider cloudintegrationtypes.CloudProviderType) (cloudintegration.CloudProviderModule, error) {
	if cloudProviderModule, ok := m.cloudProvidersMap[provider]; ok {
		return cloudProviderModule, nil
	}

	return nil, errors.New(errors.TypeUnsupported, cloudintegrationtypes.ErrCodeUnsupported, "cloud provider is not supported")
}

func (module *module) getOrCreateIngestionKey(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (string, error) {
	keyName := cloudintegrationtypes.NewIngestionKeyName(provider)

	result, err := module.gateway.SearchIngestionKeysByName(ctx, orgID, keyName, 1, 10)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "couldn't search ingestion keys")
	}

	for _, k := range result.Keys {
		if k.Name == keyName {
			return k.Value, nil
		}
	}

	created, err := module.gateway.CreateIngestionKey(ctx, orgID, keyName, []string{"integration"}, time.Time{})
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "couldn't create ingestion key")
	}

	return created.Value, nil
}

func (module *module) getOrCreateAPIKey(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (string, error) {
	integrationUser, err := module.getOrCreateIntegrationUser(ctx, orgID, provider)
	if err != nil {
		return "", err
	}

	existingKeys, err := module.userSetter.ListAPIKeys(ctx, orgID)
	if err != nil {
		return "", err
	}

	keyName := cloudintegrationtypes.NewAPIKeyName(provider)

	for _, key := range existingKeys {
		if key.Name == keyName && key.UserID == integrationUser.ID {
			return key.Token, nil
		}
	}

	apiKey, err := types.NewStorableAPIKey(keyName, integrationUser.ID, types.RoleViewer, 0)
	if err != nil {
		return "", err
	}

	err = module.userSetter.CreateAPIKey(ctx, apiKey)
	if err != nil {
		return "", err
	}

	return apiKey.Token, nil
}

func (module *module) getOrCreateIntegrationUser(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*types.User, error) {
	email, err := cloudintegrationtypes.GetCloudProviderEmail(provider)
	if err != nil {
		return nil, err
	}

	// get user by email
	integrationUser, err := module.userGetter.GetNonDeletedUserByEmailAndOrgID(ctx, email, orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	// if user found, return
	if integrationUser != nil {
		return integrationUser, nil
	}

	// if user not found, create a new one
	displayName := cloudintegrationtypes.NewIntegrationUserDisplayName(provider)
	integrationUser, err = types.NewUser(displayName, email, orgID, types.UserStatusActive)
	if err != nil {
		return nil, err
	}

	password := types.MustGenerateFactorPassword(integrationUser.ID.String())

	err = module.userSetter.CreateUser(ctx, integrationUser, user.WithFactorPassword(password))
	if err != nil {
		return nil, err
	}

	return integrationUser, nil
}
