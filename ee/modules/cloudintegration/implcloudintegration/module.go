package implcloudintegration

import (
	"context"
	"fmt"
	"sort"
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
) (cloudintegration.Module, error) {
	awsCloudProviderModule, err := implcloudprovider.NewAWSCloudProvider()
	if err != nil {
		return nil, err
	}
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
	}, nil
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
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storableAccount, err := module.store.GetAccountByID(ctx, orgID, accountID, provider)
	if err != nil {
		return nil, err
	}

	return cloudintegrationtypes.NewAccountFromStorable(storableAccount)
}

// ListAccounts return only agent connected accounts
func (module *module) ListAccounts(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) ([]*cloudintegrationtypes.Account, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storableAccounts, err := module.store.ListConnectedAccounts(ctx, orgID, provider)
	if err != nil {
		return nil, err
	}

	return cloudintegrationtypes.NewAccountsFromStorables(storableAccounts)
}

func (module *module) AgentCheckIn(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, req *cloudintegrationtypes.AgentCheckInRequest) (*cloudintegrationtypes.AgentCheckInResponse, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	connectedAccount, err := module.store.GetConnectedAccount(ctx, orgID, provider, req.ProviderAccountID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	// If a different integration is already connected to this provider account ID, reject the check-in.
	// Allow re-check-in from the same integration (e.g. agent restarting).
	if connectedAccount != nil && connectedAccount.ID != req.CloudIntegrationID {
		errMessage := fmt.Sprintf("provider account id %s is already connected to cloud integration id %s", req.ProviderAccountID, connectedAccount.ID)
		return nil, errors.New(errors.TypeAlreadyExists, cloudintegrationtypes.ErrCodeCloudIntegrationAlreadyConnected, errMessage)
	}

	account, err := module.store.GetAccountByID(ctx, orgID, req.CloudIntegrationID, provider)
	if err != nil {
		return nil, err
	}

	account.AccountID = &req.ProviderAccountID
	account.LastAgentReport = &cloudintegrationtypes.StorableAgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            req.Data,
	}

	err = module.store.UpdateAccount(ctx, account)
	if err != nil {
		return nil, err
	}

	// If account has been removed (disconnected), return a minimal response with empty integration config.
	// The agent doesn't act on config for removed accounts.
	if account.RemovedAt != nil {
		return &cloudintegrationtypes.AgentCheckInResponse{
			CloudIntegrationID: account.ID.StringValue(),
			ProviderAccountID:  req.ProviderAccountID,
			IntegrationConfig:  &cloudintegrationtypes.ProviderIntegrationConfig{},
			RemovedAt:          account.RemovedAt,
		}, nil
	}

	// Get account as domain object for config access (enabled regions, etc.)
	accountDomain, err := cloudintegrationtypes.NewAccountFromStorable(account)
	if err != nil {
		return nil, err
	}

	cloudProvider, err := module.GetCloudProvider(provider)
	if err != nil {
		return nil, err
	}

	storedServices, err := module.store.ListServices(ctx, req.CloudIntegrationID)
	if err != nil {
		return nil, err
	}

	// Delegate integration config building entirely to the provider module
	integrationConfig, err := cloudProvider.BuildIntegrationConfig(accountDomain, storedServices)
	if err != nil {
		return nil, err
	}

	return &cloudintegrationtypes.AgentCheckInResponse{
		CloudIntegrationID: account.ID.StringValue(),
		ProviderAccountID:  req.ProviderAccountID,
		IntegrationConfig:  integrationConfig,
		RemovedAt:          account.RemovedAt,
	}, nil
}

func (module *module) UpdateAccount(ctx context.Context, account *cloudintegrationtypes.Account) error {
	_, err := module.licensing.GetActive(ctx, account.OrgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storableAccount, err := cloudintegrationtypes.NewStorableCloudIntegration(account)
	if err != nil {
		return err
	}

	return module.store.UpdateAccount(ctx, storableAccount)
}

func (module *module) DisconnectAccount(ctx context.Context, orgID valuer.UUID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	return module.store.RemoveAccount(ctx, orgID, accountID, provider)
}

func (module *module) ListServicesMetadata(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, integrationID *valuer.UUID) ([]*cloudintegrationtypes.ServiceMetadata, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	cloudProvider, err := module.GetCloudProvider(provider)
	if err != nil {
		return nil, err
	}

	serviceDefinitions, err := cloudProvider.ListServiceDefinitions()
	if err != nil {
		return nil, err
	}

	enabledServiceIDs := map[string]bool{}
	if integrationID != nil {
		_, err := module.store.GetAccountByID(ctx, orgID, *integrationID, provider)
		if err != nil {
			return nil, err
		}

		storedServices, err := module.store.ListServices(ctx, *integrationID)
		if err != nil {
			return nil, err
		}

		for _, svc := range storedServices {
			serviceConfig, err := cloudProvider.ServiceConfigFromStorableServiceConfig(svc.Config)
			if err != nil {
				return nil, err
			}

			if cloudProvider.IsServiceEnabled(serviceConfig) {
				enabledServiceIDs[svc.Type.StringValue()] = true
			}
		}
	}

	resp := make([]*cloudintegrationtypes.ServiceMetadata, 0, len(serviceDefinitions))
	for _, serviceDefinition := range serviceDefinitions {
		resp = append(resp, cloudintegrationtypes.NewServiceMetadata(serviceDefinition, enabledServiceIDs[serviceDefinition.ID]))
	}

	return resp, nil
}

func (module *module) GetService(ctx context.Context, orgID valuer.UUID, integrationID *valuer.UUID, serviceID cloudintegrationtypes.ServiceID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.Service, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	cloudProvider, err := module.GetCloudProvider(provider)
	if err != nil {
		return nil, err
	}

	serviceDefinition, err := cloudProvider.GetServiceDefinition(serviceID)
	if err != nil {
		return nil, err
	}

	var integrationService *cloudintegrationtypes.CloudIntegrationService

	if integrationID != nil {
		_, err := module.store.GetAccountByID(ctx, orgID, *integrationID, provider)
		if err != nil {
			return nil, err
		}

		storedService, err := module.store.GetServiceByServiceID(ctx, *integrationID, serviceID)
		if err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
		if storedService != nil {
			serviceConfig, err := cloudProvider.ServiceConfigFromStorableServiceConfig(storedService.Config)
			if err != nil {
				return nil, err
			}

			integrationService = cloudintegrationtypes.NewCloudIntegrationServiceFromStorable(storedService, serviceConfig)
		}
	}

	return cloudintegrationtypes.NewService(*serviceDefinition, integrationService), nil
}

func (module *module) CreateService(ctx context.Context, orgID valuer.UUID, service *cloudintegrationtypes.CloudIntegrationService, provider cloudintegrationtypes.CloudProviderType) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	cloudProvider, err := module.GetCloudProvider(provider)
	if err != nil {
		return err
	}

	serviceDefinition, err := cloudProvider.GetServiceDefinition(service.Type)
	if err != nil {
		return err
	}

	configJSON, err := cloudProvider.StorableConfigFromServiceConfig(service.Config, serviceDefinition.SupportedSignals)
	if err != nil {
		return err
	}

	return module.store.CreateService(ctx, cloudintegrationtypes.NewStorableCloudIntegrationService(service, configJSON))
}

func (module *module) UpdateService(ctx context.Context, orgID valuer.UUID, integrationService *cloudintegrationtypes.CloudIntegrationService, provider cloudintegrationtypes.CloudProviderType) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	cloudProvider, err := module.GetCloudProvider(provider)
	if err != nil {
		return err
	}

	serviceDefinition, err := cloudProvider.GetServiceDefinition(integrationService.Type)
	if err != nil {
		return err
	}

	configJSON, err := cloudProvider.StorableConfigFromServiceConfig(integrationService.Config, serviceDefinition.SupportedSignals)
	if err != nil {
		return err
	}

	storableService := cloudintegrationtypes.NewStorableCloudIntegrationService(integrationService, configJSON)

	return module.store.UpdateService(ctx, storableService)
}

func (module *module) listDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	var allDashboards []*dashboardtypes.Dashboard

	for provider := range module.cloudProvidersMap {
		cloudProvider, err := module.GetCloudProvider(provider)
		if err != nil {
			return nil, err
		}

		connectedAccounts, err := module.store.ListConnectedAccounts(ctx, orgID, provider)
		if err != nil {
			return nil, err
		}

		for _, storableAccount := range connectedAccounts {
			storedServices, err := module.store.ListServices(ctx, storableAccount.ID)
			if err != nil {
				return nil, err
			}

			for _, storedSvc := range storedServices {
				serviceConfig, err := cloudProvider.ServiceConfigFromStorableServiceConfig(storedSvc.Config)
				if err != nil || !cloudProvider.IsMetricsEnabled(serviceConfig) {
					continue
				}

				svcDef, err := cloudProvider.GetServiceDefinition(storedSvc.Type)
				if err != nil || svcDef == nil {
					continue
				}

				dashboards := cloudintegrationtypes.GetDashboardsFromAssets(
					storedSvc.Type.StringValue(),
					orgID,
					provider,
					storableAccount.CreatedAt,
					svcDef.Assets,
				)
				allDashboards = append(allDashboards, dashboards...)
			}
		}
	}

	sort.Slice(allDashboards, func(i, j int) bool {
		return allDashboards[i].ID < allDashboards[j].ID
	})

	return allDashboards, nil
}

func (module *module) GetDashboardByID(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	_, _, _, err = cloudintegrationtypes.ParseCloudIntegrationDashboardID(id)
	if err != nil {
		return nil, err
	}

	allDashboards, err := module.listDashboards(ctx, orgID)
	if err != nil {
		return nil, err
	}

	for _, d := range allDashboards {
		if d.ID == id {
			return d, nil
		}
	}

	return nil, errors.New(errors.TypeNotFound, cloudintegrationtypes.ErrCodeCloudIntegrationNotFound, "cloud integration dashboard not found")
}

func (module *module) ListDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	return module.listDashboards(ctx, orgID)
}

func (module *module) GetCloudProvider(provider cloudintegrationtypes.CloudProviderType) (cloudintegration.CloudProviderModule, error) {
	if cloudProviderModule, ok := module.cloudProvidersMap[provider]; ok {
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

	// ideally there should be only one key per cloud integration provider
	if len(result.Keys) > 0 {
		return result.Keys[0].Value, nil
	}

	createdIngestionKey, err := module.gateway.CreateIngestionKey(ctx, orgID, keyName, []string{"integration"}, time.Time{})
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "couldn't create ingestion key")
	}

	return createdIngestionKey.Value, nil
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
