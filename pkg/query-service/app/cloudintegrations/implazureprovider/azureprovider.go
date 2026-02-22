package implazureprovider

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/baseprovider"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/exp/maps"
)

var (
	CodeInvalidAzureRegion = errors.MustNewCode("invalid_azure_region")
)

type azureProvider struct {
	baseprovider.BaseCloudProvider[*integrationtypes.AzureDefinition]
}

func NewAzureCloudProvider(
	logger *slog.Logger,
	accountsRepo store.CloudProviderAccountsRepository,
	serviceConfigRepo store.ServiceConfigDatabase,
	querier querier.Querier,
) (integrationtypes.CloudProvider, error) {
	azureServiceDefinitions, err := services.NewAzureCloudProviderServices()
	if err != nil {
		return nil, err
	}

	return &azureProvider{
		BaseCloudProvider: baseprovider.BaseCloudProvider[*integrationtypes.AzureDefinition]{
			Logger:             logger,
			Querier:            querier,
			AccountsRepo:       accountsRepo,
			ServiceConfigRepo:  serviceConfigRepo,
			ServiceDefinitions: azureServiceDefinitions,
			ProviderType:       integrationtypes.CloudProviderAzure,
		},
	}, nil
}

func (a *azureProvider) AgentCheckIn(ctx context.Context, req *integrationtypes.PostableAgentCheckInPayload) (any, error) {
	existingAccount, err := a.AccountsRepo.Get(ctx, req.OrgID, a.GetName().String(), req.ID)
	if err != nil {
		return nil, err
	}

	if existingAccount != nil && existingAccount.AccountID != nil && *existingAccount.AccountID != req.AccountID {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"can't check in with new %s account id %s for account %s with existing %s id %s",
			a.GetName().String(), req.AccountID, existingAccount.ID.StringValue(), a.GetName().String(),
			*existingAccount.AccountID,
		)
	}

	existingAccount, err = a.AccountsRepo.GetConnectedCloudAccount(ctx, req.OrgID, a.GetName().String(), req.AccountID)
	if err != nil {
		return nil, err
	}
	if existingAccount != nil && existingAccount.ID.StringValue() != req.ID {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"can't check in to %s account %s with id %s. already connected with id %s",
			a.GetName().String(), req.AccountID, req.ID, existingAccount.ID.StringValue(),
		)
	}

	agentReport := integrationtypes.AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            req.Data,
	}

	account, err := a.AccountsRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), &req.ID, nil, &req.AccountID, &agentReport, nil,
	)
	if err != nil {
		return nil, err
	}

	agentConfig, err := a.getAzureAgentConfig(ctx, account)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.GettableAzureAgentCheckIn{
		AccountId:         account.ID.StringValue(),
		CloudAccountId:    *account.AccountID,
		RemovedAt:         account.RemovedAt,
		IntegrationConfig: *agentConfig,
	}, nil
}

func (a *azureProvider) getAzureAgentConfig(ctx context.Context, account *integrationtypes.CloudIntegration) (*integrationtypes.AzureAgentIntegrationConfig, error) {
	// prepare and return integration config to be consumed by agent
	agentConfig := &integrationtypes.AzureAgentIntegrationConfig{
		TelemetryCollectionStrategy: make(map[string]*integrationtypes.AzureCollectionStrategy),
	}

	accountConfig := new(integrationtypes.AzureAccountConfig)
	err := integrationtypes.UnmarshalJSON([]byte(account.Config), accountConfig)
	if err != nil {
		return nil, err
	}

	if account.Config != "" {
		agentConfig.DeploymentRegion = accountConfig.DeploymentRegion
		agentConfig.EnabledResourceGroups = accountConfig.EnabledResourceGroups
	}

	svcConfigs, err := a.ServiceConfigRepo.GetAllForAccount(
		ctx, account.OrgID, account.ID.StringValue(),
	)
	if err != nil {
		return nil, err
	}

	// accumulate config in a fixed order to ensure same config generated across runs
	configuredServices := maps.Keys(svcConfigs)
	slices.Sort(configuredServices)

	for _, svcType := range configuredServices {
		definition, err := a.ServiceDefinitions.GetServiceDefinition(ctx, svcType)
		if err != nil {
			continue
		}
		config := svcConfigs[svcType]

		serviceConfig := new(integrationtypes.AzureCloudServiceConfig)
		err = integrationtypes.UnmarshalJSON(config, serviceConfig)
		if err != nil {
			continue
		}

		metrics := make([]*integrationtypes.AzureMetricsStrategy, 0)
		logs := make([]*integrationtypes.AzureLogsStrategy, 0)

		metricsStrategyMap := make(map[string]*integrationtypes.AzureMetricsStrategy)
		logsStrategyMap := make(map[string]*integrationtypes.AzureLogsStrategy)

		if definition.Strategy != nil && definition.Strategy.Metrics != nil {
			for _, metric := range definition.Strategy.Metrics {
				metricsStrategyMap[metric.Name] = metric
			}
		}

		if definition.Strategy != nil && definition.Strategy.Logs != nil {
			for _, log := range definition.Strategy.Logs {
				logsStrategyMap[log.Name] = log
			}
		}

		if serviceConfig.Metrics != nil {
			for _, metric := range serviceConfig.Metrics {
				if metric.Enabled {
					metrics = append(metrics, &integrationtypes.AzureMetricsStrategy{
						CategoryType: metricsStrategyMap[metric.Name].CategoryType,
						Name:         metric.Name,
					})
				}
			}
		}

		if serviceConfig.Logs != nil {
			for _, log := range serviceConfig.Logs {
				if log.Enabled {
					logs = append(logs, &integrationtypes.AzureLogsStrategy{
						CategoryType: logsStrategyMap[log.Name].CategoryType,
						Name:         log.Name,
					})
				}
			}
		}

		strategy := &integrationtypes.AzureCollectionStrategy{
			Metrics: metrics,
			Logs:    logs,
		}

		agentConfig.TelemetryCollectionStrategy[svcType] = strategy
	}

	return agentConfig, nil
}

func (a *azureProvider) ListServices(ctx context.Context, orgID string, cloudAccountID *string) (any, error) {
	svcConfigs := make(map[string]*integrationtypes.AzureCloudServiceConfig)
	if cloudAccountID != nil {
		activeAccount, err := a.AccountsRepo.GetConnectedCloudAccount(ctx, orgID, a.GetName().String(), *cloudAccountID)
		if err != nil {
			return nil, err
		}

		serviceConfigs, err := a.ServiceConfigRepo.GetAllForAccount(ctx, orgID, activeAccount.ID.StringValue())
		if err != nil {
			return nil, err
		}

		for svcType, config := range serviceConfigs {
			serviceConfig := new(integrationtypes.AzureCloudServiceConfig)
			err = integrationtypes.UnmarshalJSON(config, serviceConfig)
			if err != nil {
				return nil, err
			}
			svcConfigs[svcType] = serviceConfig
		}
	}

	summaries := make([]integrationtypes.AzureServiceSummary, 0)

	definitions, err := a.ServiceDefinitions.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, err
	}

	for _, def := range definitions {
		summary := integrationtypes.AzureServiceSummary{
			DefinitionMetadata: def.DefinitionMetadata,
			Config:             nil,
		}

		summary.Config = svcConfigs[summary.Id]

		summaries = append(summaries, summary)
	}

	slices.SortFunc(summaries, func(a, b integrationtypes.AzureServiceSummary) int {
		if a.DefinitionMetadata.Title < b.DefinitionMetadata.Title {
			return -1
		}
		if a.DefinitionMetadata.Title > b.DefinitionMetadata.Title {
			return 1
		}
		return 0
	})

	return &integrationtypes.GettableAzureServices{
		Services: summaries,
	}, nil
}

func (a *azureProvider) GetServiceDetails(ctx context.Context, req *integrationtypes.GetServiceDetailsReq) (any, error) {
	details := new(integrationtypes.GettableAzureServiceDetails)

	azureDefinition, err := a.ServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, err
	}

	details.AzureDefinition = *azureDefinition
	if req.CloudAccountID == nil {
		return details, nil
	}

	config, err := a.getServiceConfig(ctx, azureDefinition, req.OrgID.String(), req.ServiceId, *req.CloudAccountID)
	if err != nil {
		return nil, err
	}

	details.Config = config

	// fill default values for config
	if details.Config == nil {
		cfg := new(integrationtypes.AzureCloudServiceConfig)

		logs := make([]*integrationtypes.AzureCloudServiceLogsConfig, 0)
		if azureDefinition.Strategy != nil && azureDefinition.Strategy.Logs != nil {
			for _, log := range azureDefinition.Strategy.Logs {
				logs = append(logs, &integrationtypes.AzureCloudServiceLogsConfig{
					Enabled: false,
					Name:    log.Name,
				})
			}
		}

		metrics := make([]*integrationtypes.AzureCloudServiceMetricsConfig, 0)
		if azureDefinition.Strategy != nil && azureDefinition.Strategy.Metrics != nil {
			for _, metric := range azureDefinition.Strategy.Metrics {
				metrics = append(metrics, &integrationtypes.AzureCloudServiceMetricsConfig{
					Enabled: false,
					Name:    metric.Name,
				})
			}
		}

		cfg.Logs = logs
		cfg.Metrics = metrics

		details.Config = cfg
	}

	isMetricsEnabled := details.Config != nil && details.Config.IsMetricsEnabled()
	isLogsEnabled := details.Config != nil && details.Config.IsLogsEnabled()

	connectionStatus, err := a.GetServiceConnectionStatus(
		ctx,
		*req.CloudAccountID,
		req.OrgID,
		azureDefinition,
		isMetricsEnabled,
		isLogsEnabled,
	)
	if err != nil {
		return nil, err
	}

	details.ConnectionStatus = connectionStatus
	return details, nil
}

func (a *azureProvider) getServiceConfig(
	ctx context.Context,
	definition *integrationtypes.AzureDefinition,
	orgID string,
	serviceId string,
	cloudAccountId string,
) (*integrationtypes.AzureCloudServiceConfig, error) {
	activeAccount, err := a.AccountsRepo.GetConnectedCloudAccount(ctx, orgID, a.GetName().String(), cloudAccountId)
	if err != nil {
		return nil, err
	}

	configBytes, err := a.ServiceConfigRepo.Get(ctx, orgID, activeAccount.ID.String(), serviceId)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return nil, nil
		}
		return nil, err
	}

	config := new(integrationtypes.AzureCloudServiceConfig)
	err = integrationtypes.UnmarshalJSON(configBytes, config)
	if err != nil {
		return nil, err
	}

	if config.IsMetricsEnabled() {
		definition.PopulateDashboardURLs(a.GetName(), serviceId)
	}

	return config, nil
}

func (a *azureProvider) GetAvailableDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	return baseprovider.GetAvailableDashboards(ctx, &a.BaseCloudProvider, orgID, func(c *integrationtypes.AzureCloudServiceConfig) bool {
		return c.IsMetricsEnabled()
	})
}

func (a *azureProvider) GetDashboard(ctx context.Context, req *integrationtypes.GettableDashboard) (*dashboardtypes.Dashboard, error) {
	return a.BaseCloudProvider.GetDashboard(ctx, req, a.GetAvailableDashboards)
}

func (a *azureProvider) GenerateConnectionArtifact(ctx context.Context, req *integrationtypes.PostableConnectionArtifact) (any, error) {
	connection := new(integrationtypes.PostableAzureConnectionCommand)

	err := integrationtypes.UnmarshalJSON(req.Data, connection)
	if err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "failed unmarshal request data into AWS connection config")
	}

	// validate connection config
	if connection.AccountConfig != nil {
		if !integrationtypes.ValidAzureRegions[connection.AccountConfig.DeploymentRegion] {
			return nil, errors.NewInvalidInputf(CodeInvalidAzureRegion, "invalid azure region: %s",
				connection.AccountConfig.DeploymentRegion,
			)
		}
	}

	config, err := integrationtypes.MarshalJSON(connection.AccountConfig)
	if err != nil {
		return nil, err
	}

	account, err := a.AccountsRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), nil, config,
		nil, nil, nil,
	)
	if err != nil {
		return nil, err
	}

	agentVersion := "v0.0.1"

	if connection.AgentConfig.Version != "" {
		agentVersion = connection.AgentConfig.Version
	}

	// TODO: improve the command and set url
	cliCommand := []string{"az", "stack", "sub", "create", "--name", "SigNozIntegration", "--location",
		connection.AccountConfig.DeploymentRegion, "--template-uri", fmt.Sprintf("<url>%s", agentVersion),
		"--action-on-unmanage", "deleteAll", "--deny-settings-mode", "denyDelete", "--parameters", fmt.Sprintf("rgName=%s", "signoz-integration-rg"),
		fmt.Sprintf("rgLocation=%s", connection.AccountConfig.DeploymentRegion)}

	return &integrationtypes.GettableAzureConnectionCommand{
		AccountId:                   account.ID.String(),
		AzureShellConnectionCommand: "az create",
		AzureCliConnectionCommand:   strings.Join(cliCommand, " "),
	}, nil
}

func (a *azureProvider) UpdateServiceConfig(ctx context.Context, req *integrationtypes.PatchableServiceConfig) (any, error) {
	definition, err := a.ServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, err
	}

	serviceConfig := new(integrationtypes.UpdatableAzureCloudServiceConfig)
	err = integrationtypes.UnmarshalJSON(req.Config, serviceConfig)
	if err != nil {
		return nil, err
	}

	if err = serviceConfig.Config.Validate(definition); err != nil {
		return nil, err
	}

	// can only update config for a connected cloud account id
	_, err = a.AccountsRepo.GetConnectedCloudAccount(
		ctx, req.OrgID, a.GetName().String(), serviceConfig.CloudAccountId,
	)
	if err != nil {
		return nil, err
	}

	serviceConfigBytes, err := integrationtypes.MarshalJSON(serviceConfig.Config)
	if err != nil {
		return nil, err
	}

	updatedConfig, err := a.ServiceConfigRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), serviceConfig.CloudAccountId, req.ServiceId, serviceConfigBytes,
	)
	if err != nil {
		return nil, err
	}

	if err = integrationtypes.UnmarshalJSON(updatedConfig, serviceConfig); err != nil {
		return nil, err
	}

	return &integrationtypes.PatchServiceConfigResponse{
		ServiceId: req.ServiceId,
		Config:    serviceConfig,
	}, nil
}

func (a *azureProvider) UpdateAccountConfig(ctx context.Context, req *integrationtypes.PatchableAccountConfig) (any, error) {
	config := new(integrationtypes.PatchableAzureAccountConfig)

	err := integrationtypes.UnmarshalJSON(req.Data, config)
	if err != nil {
		return nil, err
	}

	if config.Config == nil && len(config.Config.EnabledResourceGroups) < 1 {
		return nil, errors.NewInvalidInputf(CodeInvalidAzureRegion, "azure region and resource groups must be provided")
	}

	//for azure, preserve deployment region if already set
	account, err := a.AccountsRepo.Get(ctx, req.OrgID, a.GetName().String(), req.AccountId)
	if err != nil {
		return nil, err
	}

	storedConfig := new(integrationtypes.AzureAccountConfig)
	err = integrationtypes.UnmarshalJSON([]byte(account.Config), storedConfig)
	if err != nil {
		return nil, err
	}

	if account.Config != "" {
		config.Config.DeploymentRegion = storedConfig.DeploymentRegion
	}

	configBytes, err := integrationtypes.MarshalJSON(config.Config)
	if err != nil {
		return nil, err
	}

	accountRecord, err := a.AccountsRepo.Upsert(
		ctx, req.OrgID, a.GetName().String(), &req.AccountId, configBytes, nil, nil, nil,
	)
	if err != nil {
		return nil, err
	}

	return accountRecord.Account(a.GetName()), nil
}
