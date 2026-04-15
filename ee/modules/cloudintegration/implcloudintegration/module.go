package implcloudintegration

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/gateway"
	"github.com/SigNoz/signoz/pkg/global"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/modules/serviceaccount"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/serviceaccounttypes"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type module struct {
	store             cloudintegrationtypes.Store
	gateway           gateway.Gateway
	zeus              zeus.Zeus
	licensing         licensing.Licensing
	global            global.Global
	serviceAccount    serviceaccount.Module
	cloudProvidersMap map[cloudintegrationtypes.CloudProviderType]cloudintegration.CloudProviderModule
	config            cloudintegration.Config
}

func NewModule(
	store cloudintegrationtypes.Store,
	global global.Global,
	zeus zeus.Zeus,
	gateway gateway.Gateway,
	licensing licensing.Licensing,
	serviceAccount serviceaccount.Module,
	cloudProvidersMap map[cloudintegrationtypes.CloudProviderType]cloudintegration.CloudProviderModule,
	config cloudintegration.Config,
) (cloudintegration.Module, error) {
	return &module{
		store:             store,
		global:            global,
		zeus:              zeus,
		gateway:           gateway,
		licensing:         licensing,
		serviceAccount:    serviceAccount,
		cloudProvidersMap: cloudProvidersMap,
		config:            config,
	}, nil
}

// GetConnectionCredentials returns credentials required to generate connection artifact. eg. apiKey, ingestionKey etc.
// It will return creds it can deduce and return empty value for others.
func (module *module) GetConnectionCredentials(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.Credentials, error) {
	// get license to get the deployment details
	license, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	// get deployment details from zeus, ignore error
	respBytes, _ := module.zeus.GetDeployment(ctx, license.Key)

	var signozAPIURL string

	if len(respBytes) > 0 {
		// parse deployment details, ignore error, if client is asking api url every time check for possible error
		deployment, _ := zeustypes.NewGettableDeployment(respBytes)
		if deployment != nil {
			signozAPIURL, _ = cloudintegrationtypes.GetSigNozAPIURLFromDeployment(deployment)
		}
	}

	// ignore error
	apiKey, _ := module.getOrCreateAPIKey(ctx, orgID, provider)

	// ignore error
	ingestionKey, _ := module.getOrCreateIngestionKey(ctx, orgID, provider)

	return cloudintegrationtypes.NewCredentials(
		signozAPIURL,
		apiKey,
		module.global.GetConfig(ctx).IngestionURL,
		ingestionKey,
	), nil
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

func (module *module) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.GetConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	_, err := module.licensing.GetActive(ctx, account.OrgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	cloudProviderModule, err := module.getCloudProvider(account.Provider)
	if err != nil {
		return nil, err
	}

	req.Config.SetAgentVersion(module.config.Agent.Version)
	return cloudProviderModule.GetConnectionArtifact(ctx, account, req)
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

func (module *module) GetConnectedAccount(ctx context.Context, orgID, accountID valuer.UUID, provider cloudintegrationtypes.CloudProviderType) (*cloudintegrationtypes.Account, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	storableAccount, err := module.store.GetConnectedAccount(ctx, orgID, accountID, provider)
	if err != nil {
		return nil, err
	}

	return cloudintegrationtypes.NewAccountFromStorable(storableAccount)
}

// ListAccounts return only agent connected accounts.
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

	connectedAccount, err := module.store.GetConnectedAccountByProviderAccountID(ctx, orgID, req.ProviderAccountID, provider)
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

	// If account has been removed (disconnected), return a minimal response with empty integration config.
	// The agent uses this response to clean up resources
	if account.RemovedAt != nil {
		return cloudintegrationtypes.NewAgentCheckInResponse(
			req.ProviderAccountID,
			account.ID.StringValue(),
			new(cloudintegrationtypes.ProviderIntegrationConfig),
			account.RemovedAt,
		), nil
	}

	// update account with cloud provider account id and agent report (heartbeat)
	account.Update(&req.ProviderAccountID, cloudintegrationtypes.NewAgentReport(req.Data))

	err = module.store.UpdateAccount(ctx, account)
	if err != nil {
		return nil, err
	}

	// Get account as domain object for config access (enabled regions, etc.)
	domainAccount, err := cloudintegrationtypes.NewAccountFromStorable(account)
	if err != nil {
		return nil, err
	}

	cloudProvider, err := module.getCloudProvider(provider)
	if err != nil {
		return nil, err
	}

	storedServices, err := module.store.ListServices(ctx, req.CloudIntegrationID)
	if err != nil {
		return nil, err
	}

	// Delegate integration config building entirely to the provider module
	integrationConfig, err := cloudProvider.BuildIntegrationConfig(ctx, domainAccount, storedServices)
	if err != nil {
		return nil, err
	}

	return cloudintegrationtypes.NewAgentCheckInResponse(
		req.ProviderAccountID,
		account.ID.StringValue(),
		integrationConfig,
		account.RemovedAt,
	), nil
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

func (module *module) ListServicesMetadata(ctx context.Context, orgID valuer.UUID, provider cloudintegrationtypes.CloudProviderType, integrationID valuer.UUID) ([]*cloudintegrationtypes.ServiceMetadata, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	cloudProvider, err := module.getCloudProvider(provider)
	if err != nil {
		return nil, err
	}

	serviceDefinitions, err := cloudProvider.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, err
	}

	enabledServiceIDs := map[string]bool{}
	if !integrationID.IsZero() {
		storedServices, err := module.store.ListServices(ctx, integrationID)
		if err != nil {
			return nil, err
		}

		for _, svc := range storedServices {
			serviceConfig, err := cloudintegrationtypes.NewServiceConfigFromJSON(provider, svc.Config)
			if err != nil {
				return nil, err
			}

			if serviceConfig.IsServiceEnabled(provider) {
				enabledServiceIDs[svc.Type.StringValue()] = true
			}
		}
	}

	resp := make([]*cloudintegrationtypes.ServiceMetadata, 0, len(serviceDefinitions))
	for _, serviceDefinition := range serviceDefinitions {
		resp = append(resp, cloudintegrationtypes.NewServiceMetadata(*serviceDefinition, enabledServiceIDs[serviceDefinition.ID]))
	}

	return resp, nil
}

func (module *module) GetService(ctx context.Context, orgID valuer.UUID, serviceID cloudintegrationtypes.ServiceID, provider cloudintegrationtypes.CloudProviderType, cloudIntegrationID valuer.UUID) (*cloudintegrationtypes.Service, error) {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return nil, errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	cloudProvider, err := module.getCloudProvider(provider)
	if err != nil {
		return nil, err
	}

	serviceDefinition, err := cloudProvider.GetServiceDefinition(ctx, serviceID)
	if err != nil {
		return nil, err
	}

	var integrationService *cloudintegrationtypes.CloudIntegrationService

	if !cloudIntegrationID.IsZero() {
		storedService, err := module.store.GetServiceByServiceID(ctx, cloudIntegrationID, serviceID)
		if err != nil && !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}
		if storedService != nil {
			serviceConfig, err := cloudintegrationtypes.NewServiceConfigFromJSON(provider, storedService.Config)
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

	cloudProvider, err := module.getCloudProvider(provider)
	if err != nil {
		return err
	}

	serviceDefinition, err := cloudProvider.GetServiceDefinition(ctx, service.Type)
	if err != nil {
		return err
	}

	configJSON, err := service.Config.ToJSON(provider, service.Type, &serviceDefinition.SupportedSignals)
	if err != nil {
		return err
	}

	return module.store.CreateService(ctx, cloudintegrationtypes.NewStorableCloudIntegrationService(service, string(configJSON)))
}

func (module *module) UpdateService(ctx context.Context, orgID valuer.UUID, integrationService *cloudintegrationtypes.CloudIntegrationService, provider cloudintegrationtypes.CloudProviderType) error {
	_, err := module.licensing.GetActive(ctx, orgID)
	if err != nil {
		return errors.New(errors.TypeLicenseUnavailable, errors.CodeLicenseUnavailable, "a valid license is not available").WithAdditional("this feature requires a valid license").WithAdditional(err.Error())
	}

	cloudProvider, err := module.getCloudProvider(provider)
	if err != nil {
		return err
	}

	serviceDefinition, err := cloudProvider.GetServiceDefinition(ctx, integrationService.Type)
	if err != nil {
		return err
	}

	configJSON, err := integrationService.Config.ToJSON(provider, integrationService.Type, &serviceDefinition.SupportedSignals)
	if err != nil {
		return err
	}

	storableService := cloudintegrationtypes.NewStorableCloudIntegrationService(integrationService, string(configJSON))

	return module.store.UpdateService(ctx, storableService)
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

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	stats := make(map[string]any)

	// get connected accounts for AWS
	awsAccountsCount, err := module.store.CountConnectedAccounts(ctx, orgID, cloudintegrationtypes.CloudProviderTypeAWS)
	if err == nil {
		stats["cloudintegration.aws.connectedaccounts.count"] = awsAccountsCount
	}

	// NOTE: not adding stats for services for now.

	// TODO: add more cloud providers when supported

	return stats, nil
}

func (module *module) getCloudProvider(provider cloudintegrationtypes.CloudProviderType) (cloudintegration.CloudProviderModule, error) {
	if cloudProviderModule, ok := module.cloudProvidersMap[provider]; ok {
		return cloudProviderModule, nil
	}

	return nil, errors.NewInvalidInputf(cloudintegrationtypes.ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
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
	domain := module.serviceAccount.Config().Email.Domain
	serviceAccount := serviceaccounttypes.NewServiceAccount("integration", domain, serviceaccounttypes.ServiceAccountStatusActive, orgID)
	serviceAccount, err := module.serviceAccount.GetOrCreate(ctx, orgID, serviceAccount)
	if err != nil {
		return "", err
	}
	err = module.serviceAccount.SetRoleByName(ctx, orgID, serviceAccount.ID, authtypes.SigNozViewerRoleName)
	if err != nil {
		return "", err
	}

	factorAPIKey, err := serviceAccount.NewFactorAPIKey(provider.StringValue(), 0)
	if err != nil {
		return "", err
	}

	factorAPIKey, err = module.serviceAccount.GetOrCreateFactorAPIKey(ctx, factorAPIKey)
	if err != nil {
		return "", err
	}
	return factorAPIKey.Key, nil
}

func (module *module) listDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	var allDashboards []*dashboardtypes.Dashboard

	for provider := range module.cloudProvidersMap {
		cloudProvider, err := module.getCloudProvider(provider)
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
				serviceConfig, err := cloudintegrationtypes.NewServiceConfigFromJSON(provider, storedSvc.Config)
				if err != nil || !serviceConfig.IsMetricsEnabled(provider) {
					continue
				}

				svcDef, err := cloudProvider.GetServiceDefinition(ctx, storedSvc.Type)
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
