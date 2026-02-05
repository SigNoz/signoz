package implazureprovider

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationstypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/exp/maps"
)

var (
	CodeInvalidAzureRegion = errors.MustNewCode("invalid_azure_region")
	CodeDashboardNotFound  = errors.MustNewCode("dashboard_not_found")
)

type azureProvider struct {
	accountsRepo            store.CloudProviderAccountsRepository
	serviceConfigRepo       store.ServiceConfigDatabase
	azureServiceDefinitions *services.AzureServicesProvider
	querier                 querier.Querier
}

func NewAzureCloudProvider(
	accountsRepo store.CloudProviderAccountsRepository,
	serviceConfigRepo store.ServiceConfigDatabase,
	querier querier.Querier,
) integrationstypes.CloudProvider {
	azureServiceDefinitions, err := services.NewAzureCloudProviderServices()
	if err != nil {
		panic("failed to initialize Azure service definitions: " + err.Error())
	}

	return &azureProvider{
		accountsRepo:            accountsRepo,
		serviceConfigRepo:       serviceConfigRepo,
		azureServiceDefinitions: azureServiceDefinitions,
		querier:                 querier,
	}
}

func (a *azureProvider) GetAccountStatus(ctx context.Context, orgID, accountID string) (*integrationstypes.GettableAccountStatus, error) {
	account, err := a.accountsRepo.Get(ctx, orgID, a.GetName().String(), accountID)
	if err != nil {
		return nil, err
	}

	return &integrationstypes.GettableAccountStatus{
		Id:             account.ID.String(),
		CloudAccountId: account.AccountID,
		Status:         account.Status(),
	}, nil
}

func (a *azureProvider) ListConnectedAccounts(ctx context.Context, orgID string) (*integrationstypes.GettableConnectedAccountsList, error) {
	accountRecords, err := a.accountsRepo.ListConnected(ctx, orgID, a.GetName().String())
	if err != nil {
		return nil, err
	}

	connectedAccounts := make([]*integrationstypes.Account, 0, len(accountRecords))
	for _, r := range accountRecords {
		connectedAccounts = append(connectedAccounts, r.Account(a.GetName()))
	}

	return &integrationstypes.GettableConnectedAccountsList{
		Accounts: connectedAccounts,
	}, nil
}

func (a *azureProvider) AgentCheckIn(ctx context.Context, req *integrationstypes.PostableAgentCheckInPayload) (any, error) {
	existingAccount, err := a.accountsRepo.Get(ctx, req.OrgID, a.GetName().String(), req.ID)
	if err != nil {
		return nil, err
	}

	if existingAccount != nil && existingAccount.AccountID != nil && *existingAccount.AccountID != req.AccountID {
		return nil, model.BadRequest(fmt.Errorf(
			"can't check in with new %s account id %s for account %s with existing %s id %s",
			a.GetName().String(), req.AccountID, existingAccount.ID.StringValue(), a.GetName().String(),
			*existingAccount.AccountID,
		))
	}

	existingAccount, err = a.accountsRepo.GetConnectedCloudAccount(ctx, req.OrgID, a.GetName().String(), req.AccountID)
	if existingAccount != nil && existingAccount.ID.StringValue() != req.ID {
		return nil, model.BadRequest(fmt.Errorf(
			"can't check in to %s account %s with id %s. already connected with id %s",
			a.GetName().String(), req.AccountID, req.ID, existingAccount.ID.StringValue(),
		))
	}

	agentReport := integrationstypes.AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            req.Data,
	}

	account, err := a.accountsRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), &req.ID, nil, &req.AccountID, &agentReport, nil,
	)
	if err != nil {
		return nil, err
	}

	agentConfig, err := a.getAzureAgentConfig(ctx, account)
	if err != nil {
		return nil, err
	}

	return &integrationstypes.GettableAzureAgentCheckIn{
		AccountId:         account.ID.StringValue(),
		CloudAccountId:    *account.AccountID,
		RemovedAt:         account.RemovedAt,
		IntegrationConfig: *agentConfig,
	}, nil
}

func (a *azureProvider) getAzureAgentConfig(ctx context.Context, account *integrationstypes.CloudIntegration) (*integrationstypes.AzureAgentIntegrationConfig, error) {
	// prepare and return integration config to be consumed by agent
	agentConfig := &integrationstypes.AzureAgentIntegrationConfig{
		TelemetryCollectionStrategy: &integrationstypes.AzureCollectionStrategy{
			Provider:     a.GetName(),
			AzureMetrics: make([]*integrationstypes.AzureMetricsStrategy, 0),
			AzureLogs:    make([]*integrationstypes.AzureLogsStrategy, 0),
		},
	}

	accountConfig := new(integrationstypes.AzureAccountConfig)
	err := accountConfig.Unmarshal(account.Config)
	if err != nil {
		return nil, err
	}

	if account.Config != nil {
		agentConfig.DeploymentRegion = accountConfig.DeploymentRegion
		agentConfig.EnabledResourceGroups = accountConfig.EnabledResourceGroups
	}

	svcConfigs, err := a.serviceConfigRepo.GetAllForAccount(
		ctx, account.OrgID, account.ID.StringValue(),
	)
	if err != nil {
		return nil, err
	}

	// accumulate config in a fixed order to ensure same config generated across runs
	configuredServices := maps.Keys(svcConfigs)
	slices.Sort(configuredServices)

	metrics := make([]*integrationstypes.AzureMetricsStrategy, 0)
	logs := make([]*integrationstypes.AzureLogsStrategy, 0)

	for _, svcType := range configuredServices {
		definition, err := a.azureServiceDefinitions.GetServiceDefinition(ctx, svcType)
		if err != nil {
			continue
		}
		config := svcConfigs[svcType]

		serviceConfig := new(integrationstypes.AzureCloudServiceConfig)
		err = serviceConfig.Unmarshal(config)
		if err != nil {
			continue
		}

		metricsStrategyMap := make(map[string]*integrationstypes.AzureMetricsStrategy)
		logsStrategyMap := make(map[string]*integrationstypes.AzureLogsStrategy)

		for _, metric := range definition.Strategy.AzureMetrics {
			metricsStrategyMap[metric.Name] = metric
		}

		for _, log := range definition.Strategy.AzureLogs {
			logsStrategyMap[log.Name] = log
		}

		if serviceConfig.Metrics != nil {
			for _, metric := range serviceConfig.Metrics {
				if metric.Enabled {
					metrics = append(metrics, &integrationstypes.AzureMetricsStrategy{
						CategoryType: metricsStrategyMap[metric.Name].CategoryType,
						Name:         metric.Name,
					})
				}
			}
		}

		if serviceConfig.Logs != nil {
			for _, log := range serviceConfig.Logs {
				if log.Enabled {
					logs = append(logs, &integrationstypes.AzureLogsStrategy{
						CategoryType: logsStrategyMap[log.Name].CategoryType,
						Name:         log.Name,
					})
				}
			}
		}
	}

	agentConfig.TelemetryCollectionStrategy.AzureMetrics = metrics
	agentConfig.TelemetryCollectionStrategy.AzureLogs = logs

	return agentConfig, nil
}

func (a *azureProvider) GetName() valuer.String {
	return integrationstypes.CloudProviderAzure
}

func (a *azureProvider) ListServices(ctx context.Context, orgID string, cloudAccountID *string) (any, error) {
	svcConfigs := make(map[string]*integrationstypes.AzureCloudServiceConfig)
	if cloudAccountID != nil {
		activeAccount, err := a.accountsRepo.GetConnectedCloudAccount(ctx, orgID, a.GetName().String(), *cloudAccountID)
		if err != nil {
			return nil, err
		}

		serviceConfigs, err := a.serviceConfigRepo.GetAllForAccount(ctx, orgID, activeAccount.ID.StringValue())
		if err != nil {
			return nil, err
		}

		for svcType, config := range serviceConfigs {
			serviceConfig := new(integrationstypes.AzureCloudServiceConfig)
			err = serviceConfig.Unmarshal(config)
			if err != nil {
				return nil, err
			}
			svcConfigs[svcType] = serviceConfig
		}
	}

	summaries := make([]integrationstypes.AzureServiceSummary, 0)

	definitions, err := a.azureServiceDefinitions.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf("couldn't list aws service definitions: %w", err))
	}

	for _, def := range definitions {
		summary := integrationstypes.AzureServiceSummary{
			DefinitionMetadata: def.DefinitionMetadata,
			Config:             nil,
		}

		summary.Config = svcConfigs[summary.Id]

		summaries = append(summaries, summary)
	}

	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].DefinitionMetadata.Title < summaries[j].DefinitionMetadata.Title
	})

	return &integrationstypes.GettableAzureServices{
		Services: summaries,
	}, nil
}

func (a *azureProvider) GetServiceDetails(ctx context.Context, req *integrationstypes.GetServiceDetailsReq) (any, error) {
	details := new(integrationstypes.GettableAzureServiceDetails)

	azureDefinition, err := a.azureServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf("couldn't get aws service definition: %w", err))
	}

	details.AzureServiceDefinition = *azureDefinition
	details.Strategy.Provider = a.GetName()
	if req.CloudAccountID == nil {
		return details, nil
	}

	config, err := a.getServiceConfig(ctx, &details.AzureServiceDefinition, req.OrgID, req.ServiceId, *req.CloudAccountID)
	if err != nil {
		return nil, err
	}

	if config == nil {
		return details, nil
	}

	details.Config = config

	return details, nil
}

func (a *azureProvider) getServiceConfig(
	ctx context.Context,
	definition *integrationstypes.AzureServiceDefinition,
	orgID string,
	serviceId string,
	cloudAccountId string,
) (*integrationstypes.AzureCloudServiceConfig, error) {
	activeAccount, err := a.accountsRepo.GetConnectedCloudAccount(ctx, orgID, a.GetName().String(), cloudAccountId)
	if err != nil {
		return nil, err
	}

	configBytes, err := a.serviceConfigRepo.Get(ctx, orgID, activeAccount.ID.String(), serviceId)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return nil, nil
		}
		return nil, err
	}

	config := new(integrationstypes.AzureCloudServiceConfig)
	err = config.Unmarshal(configBytes)
	if err != nil {
		return nil, err
	}

	for _, metric := range config.Metrics {
		if metric.Enabled {
			definition.PopulateDashboardURLs(serviceId)
			break
		}
	}

	return config, nil
}

func (a *azureProvider) GenerateConnectionArtifact(ctx context.Context, req *integrationstypes.PostableConnectionArtifact) (any, error) {
	connection := new(integrationstypes.PostableAzureConnectionCommand)

	err := connection.Unmarshal(req.Data)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed unmarshal request data into AWS connection config")
	}

	// validate connection config
	if connection.AccountConfig != nil {
		if !integrationstypes.ValidAzureRegions[connection.AccountConfig.DeploymentRegion] {
			return nil, errors.NewInvalidInputf(CodeInvalidAzureRegion, "invalid azure region: %s",
				connection.AccountConfig.DeploymentRegion,
			)
		}
	}

	config, err := connection.AccountConfig.Marshal()
	if err != nil {
		return nil, err
	}

	account, err := a.accountsRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), nil, config,
		nil, nil, nil,
	)
	if err != nil {
		return nil, err
	}

	//agentVersion := "v0.0.1"
	//
	//if req.AgentConfig.Version != "" {
	//	agentVersion = req.AgentConfig.Version
	//}

	// TODO: improve cli command generation
	cliCommand := []string{"az", "stack", "sub", "create", "--name", "SigNozIntegration", "--location",
		connection.AccountConfig.DeploymentRegion, "--template-uri", "https://raw.githubusercontent.com/swagftw/signoz-pocs/refs/heads/main/template.json",
		"--action-on-unmanage", "deleteAll", "--deny-settings-mode", "denyDelete", "--parameters", fmt.Sprintf("rgName=%s", "signoz-integration-rg"),
		fmt.Sprintf("rgLocation=%s", connection.AccountConfig.DeploymentRegion)}

	return &integrationstypes.GettableAzureConnectionCommand{
		AccountId:                   account.ID.String(),
		AzureShellConnectionCommand: "az create",
		AzureCliConnectionCommand:   strings.Join(cliCommand, " "),
	}, nil
}

func (a *azureProvider) UpdateServiceConfig(ctx context.Context, req *integrationstypes.PatchableServiceConfig) (any, error) {
	definition, err := a.azureServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, err
	}

	serviceConfig := new(integrationstypes.PatchableAzureCloudServiceConfig)
	err = serviceConfig.Unmarshal(req.Config)
	if err != nil {
		return nil, err
	}

	if err = serviceConfig.Config.Validate(definition); err != nil {
		return nil, err
	}

	// can only update config for a connected cloud account id
	_, err = a.accountsRepo.GetConnectedCloudAccount(
		ctx, req.OrgID, a.GetName().String(), serviceConfig.CloudAccountId,
	)
	if err != nil {
		return nil, err
	}

	serviceConfigBytes, err := serviceConfig.Config.Marshal()
	if err != nil {
		return nil, err
	}

	updatedConfig, err := a.serviceConfigRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), serviceConfig.CloudAccountId, req.ServiceId, serviceConfigBytes,
	)
	if err != nil {
		return nil, err
	}

	if err = serviceConfig.Unmarshal(updatedConfig); err != nil {
		return nil, err
	}

	return &integrationstypes.PatchServiceConfigResponse{
		ServiceId: req.ServiceId,
		Config:    serviceConfig,
	}, nil
}

func (a *azureProvider) GetAvailableDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	accountRecords, err := a.accountsRepo.ListConnected(ctx, orgID.StringValue(), a.GetName().String())
	if err != nil {
		return nil, err
	}

	// for now service dashboards are only available when metrics are enabled.
	servicesWithAvailableMetrics := map[string]*time.Time{}

	for _, ar := range accountRecords {
		if ar.AccountID == nil {
			continue
		}

		configsBySvcId, err := a.serviceConfigRepo.GetAllForAccount(ctx, orgID.StringValue(), ar.ID.StringValue())
		if err != nil {
			return nil, err
		}

		for svcId, config := range configsBySvcId {
			serviceConfig := new(integrationstypes.AzureCloudServiceConfig)
			err = serviceConfig.Unmarshal(config)
			if err != nil {
				return nil, err
			}

			if serviceConfig.Metrics != nil {
				for _, metric := range serviceConfig.Metrics {
					if metric.Enabled {
						servicesWithAvailableMetrics[svcId] = &ar.CreatedAt
						break
					}
				}
			}
		}
	}

	svcDashboards := make([]*dashboardtypes.Dashboard, 0)

	allServices, err := a.azureServiceDefinitions.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to list azure service definitions")
	}

	for _, svc := range allServices {
		serviceDashboardsCreatedAt := servicesWithAvailableMetrics[svc.Id]
		if serviceDashboardsCreatedAt != nil {
			svcDashboards = integrationstypes.GetDashboardsFromAssets(svc.Id, a.GetName(), serviceDashboardsCreatedAt, svc.Assets)
			servicesWithAvailableMetrics[svc.Id] = nil
		}
	}

	return svcDashboards, nil
}

func (a *azureProvider) GetDashboard(ctx context.Context, req *integrationstypes.GettableDashboard) (*dashboardtypes.Dashboard, error) {
	allDashboards, err := a.GetAvailableDashboards(ctx, req.OrgID)
	if err != nil {
		return nil, err
	}

	for _, dashboard := range allDashboards {
		if dashboard.ID == req.ID {
			return dashboard, nil
		}
	}

	return nil, errors.NewNotFoundf(CodeDashboardNotFound, "dashboard with id %s not found", req.ID)
}

func (a *azureProvider) UpdateAccountConfig(ctx context.Context, req *integrationstypes.PatchableAccountConfig) (any, error) {
	config := new(integrationstypes.PatchableAzureAccountConfig)

	err := config.Unmarshal(req.Data)
	if err != nil {
		return nil, err
	}

	if config.Config == nil && len(config.Config.EnabledResourceGroups) < 1 {
		return nil, errors.NewInvalidInputf(CodeInvalidAzureRegion, "azure region and resource groups must be provided")
	}

	//for azure, preserve deployment region if already set
	account, err := a.accountsRepo.Get(ctx, req.OrgID, a.GetName().String(), req.AccountId)
	if err != nil {
		return nil, err
	}

	storedConfig := new(integrationstypes.AzureAccountConfig)
	err = storedConfig.Unmarshal(account.Config)
	if err != nil {
		return nil, err
	}

	if account.Config != nil {
		config.Config.DeploymentRegion = storedConfig.DeploymentRegion
	}

	configBytes, err := config.Config.Marshal()
	if err != nil {
		return nil, err
	}

	accountRecord, err := a.accountsRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), &req.AccountId, configBytes, nil, nil, nil,
	)
	if err != nil {
		return nil, err
	}

	return accountRecord.Account(a.GetName()), nil
}

func (a *azureProvider) DisconnectAccount(ctx context.Context, orgID, accountID string) (*integrationstypes.CloudIntegration, error) {
	account, err := a.accountsRepo.Get(ctx, orgID, a.GetName().String(), accountID)
	if err != nil {
		return nil, err
	}

	tsNow := time.Now()
	account, err = a.accountsRepo.Upsert(
		ctx, orgID, a.GetName().String(), &accountID, nil, nil, nil, &tsNow,
	)
	if err != nil {
		return nil, err
	}

	return account, nil
}
