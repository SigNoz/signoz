package implawsprovider

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/baseprovider"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	integrationstore "github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"golang.org/x/exp/maps"
)

var (
	CodeInvalidAWSRegion = errors.MustNewCode("invalid_aws_region")
)

type awsProvider struct {
	baseprovider.BaseCloudProvider[*integrationtypes.AWSDefinition]
}

func NewAWSCloudProvider(
	logger *slog.Logger,
	accountsRepo integrationstore.CloudProviderAccountsRepository,
	serviceConfigRepo integrationstore.ServiceConfigDatabase,
	querier querier.Querier,
) (integrationtypes.CloudProvider, error) {
	serviceDefinitions, err := services.NewAWSCloudProviderServices()
	if err != nil {
		return nil, err
	}

	return &awsProvider{
		BaseCloudProvider: baseprovider.BaseCloudProvider[*integrationtypes.AWSDefinition]{
			Logger:             logger,
			Querier:            querier,
			AccountsRepo:       accountsRepo,
			ServiceConfigRepo:  serviceConfigRepo,
			ServiceDefinitions: serviceDefinitions,
			ProviderType:       integrationtypes.CloudProviderAWS,
		},
	}, nil
}

func (a *awsProvider) AgentCheckIn(ctx context.Context, req *integrationtypes.PostableAgentCheckInPayload) (any, error) {
	// agent can't check in unless the account is already created
	existingAccount, err := a.AccountsRepo.Get(ctx, req.OrgID, a.GetName().String(), req.ID)
	if err != nil {
		return nil, err
	}

	if existingAccount != nil && existingAccount.AccountID != nil && *existingAccount.AccountID != req.AccountID {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "can't check in with new %s account id %s for account %s with existing %s id %s",
			a.GetName().String(), req.AccountID, existingAccount.ID.StringValue(), a.GetName().String(),
			*existingAccount.AccountID)
	}

	existingAccount, err = a.AccountsRepo.GetConnectedCloudAccount(ctx, req.OrgID, a.GetName().String(), req.AccountID)
	if existingAccount != nil && existingAccount.ID.StringValue() != req.ID {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
			"can't check in to %s account %s with id %s. already connected with id %s",
			a.GetName().String(), req.AccountID, req.ID, existingAccount.ID.StringValue())
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

	agentConfig, err := a.getAWSAgentConfig(ctx, account)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.GettableAWSAgentCheckIn{
		AccountId:         account.ID.StringValue(),
		CloudAccountId:    *account.AccountID,
		RemovedAt:         account.RemovedAt,
		IntegrationConfig: *agentConfig,
	}, nil
}

func (a *awsProvider) getAWSAgentConfig(ctx context.Context, account *integrationtypes.CloudIntegration) (*integrationtypes.AWSAgentIntegrationConfig, error) {
	// prepare and return integration config to be consumed by agent
	agentConfig := &integrationtypes.AWSAgentIntegrationConfig{
		EnabledRegions: []string{},
		TelemetryCollectionStrategy: &integrationtypes.AWSCollectionStrategy{
			Metrics:   &integrationtypes.AWSMetricsStrategy{},
			Logs:      &integrationtypes.AWSLogsStrategy{},
			S3Buckets: map[string][]string{},
		},
	}

	accountConfig := new(integrationtypes.AWSAccountConfig)
	err := integrationtypes.UnmarshalJSON([]byte(account.Config), accountConfig)
	if err != nil {
		return nil, err
	}

	if accountConfig.EnabledRegions != nil {
		agentConfig.EnabledRegions = accountConfig.EnabledRegions
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

		serviceConfig := new(integrationtypes.AWSCloudServiceConfig)
		err = integrationtypes.UnmarshalJSON(config, serviceConfig)
		if err != nil {
			continue
		}

		if serviceConfig.IsLogsEnabled() {
			if svcType == integrationtypes.S3Sync {
				// S3 bucket sync; No cloudwatch logs are appended for this service type;
				// Though definition is populated with a custom cloudwatch group that helps in calculating logs connection status
				agentConfig.TelemetryCollectionStrategy.S3Buckets = serviceConfig.Logs.S3Buckets
			} else if definition.Strategy.Logs != nil { // services that includes a logs subscription
				agentConfig.TelemetryCollectionStrategy.Logs.Subscriptions = append(
					agentConfig.TelemetryCollectionStrategy.Logs.Subscriptions,
					definition.Strategy.Logs.Subscriptions...,
				)
			}
		}

		if serviceConfig.IsMetricsEnabled() && definition.Strategy.Metrics != nil {
			agentConfig.TelemetryCollectionStrategy.Metrics.StreamFilters = append(
				agentConfig.TelemetryCollectionStrategy.Metrics.StreamFilters,
				definition.Strategy.Metrics.StreamFilters...,
			)
		}
	}

	return agentConfig, nil
}

func (a *awsProvider) ListServices(ctx context.Context, orgID string, cloudAccountID *string) (any, error) {
	svcConfigs := make(map[string]*integrationtypes.AWSCloudServiceConfig)
	if cloudAccountID != nil {
		activeAccount, err := a.AccountsRepo.GetConnectedCloudAccount(ctx, orgID, a.GetName().String(), *cloudAccountID)
		if err != nil {
			return nil, err
		}

		serviceConfigs, err := a.ServiceConfigRepo.GetAllForAccount(ctx, orgID, activeAccount.ID.String())
		if err != nil {
			return nil, err
		}

		for svcType, config := range serviceConfigs {
			serviceConfig := new(integrationtypes.AWSCloudServiceConfig)
			err = integrationtypes.UnmarshalJSON(config, serviceConfig)
			if err != nil {
				return nil, err
			}
			svcConfigs[svcType] = serviceConfig
		}
	}

	summaries := make([]integrationtypes.AWSServiceSummary, 0)

	definitions, err := a.ServiceDefinitions.ListServiceDefinitions(ctx)
	if err != nil {
		return nil, err
	}

	for _, def := range definitions {
		summary := integrationtypes.AWSServiceSummary{
			DefinitionMetadata: def.DefinitionMetadata,
			Config:             nil,
		}

		summary.Config = svcConfigs[summary.Id]

		summaries = append(summaries, summary)
	}

	slices.SortFunc(summaries, func(a, b integrationtypes.AWSServiceSummary) int {
		if a.DefinitionMetadata.Title < b.DefinitionMetadata.Title {
			return -1
		}
		if a.DefinitionMetadata.Title > b.DefinitionMetadata.Title {
			return 1
		}
		return 0
	})

	return &integrationtypes.GettableAWSServices{
		Services: summaries,
	}, nil
}

func (a *awsProvider) GetServiceDetails(ctx context.Context, req *integrationtypes.GetServiceDetailsReq) (any, error) {
	details := new(integrationtypes.GettableAWSServiceDetails)

	awsDefinition, err := a.ServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, err
	}

	details.AWSDefinition = *awsDefinition
	if req.CloudAccountID == nil {
		return details, nil
	}

	config, err := a.getServiceConfig(ctx, awsDefinition, req.OrgID, a.GetName().String(), req.ServiceId, *req.CloudAccountID)
	if err != nil {
		return nil, err
	}

	if config == nil {
		return details, nil
	}

	details.Config = config

	isMetricsEnabled := config.IsMetricsEnabled()
	isLogsEnabled := config.IsLogsEnabled()

	connectionStatus, err := a.GetServiceConnectionStatus(
		ctx,
		*req.CloudAccountID,
		req.OrgID,
		awsDefinition,
		isMetricsEnabled,
		isLogsEnabled,
	)
	if err != nil {
		return nil, err
	}

	details.ConnectionStatus = connectionStatus

	return details, nil
}

func (a *awsProvider) getServiceConfig(ctx context.Context,
	def *integrationtypes.AWSDefinition, orgID valuer.UUID, cloudProvider, serviceId, cloudAccountId string,
) (*integrationtypes.AWSCloudServiceConfig, error) {
	activeAccount, err := a.AccountsRepo.GetConnectedCloudAccount(ctx, orgID.String(), cloudProvider, cloudAccountId)
	if err != nil {
		return nil, err
	}

	config, err := a.ServiceConfigRepo.Get(ctx, orgID.String(), activeAccount.ID.StringValue(), serviceId)
	if err != nil {
		if errors.Ast(err, errors.TypeNotFound) {
			return nil, nil
		}

		return nil, err
	}

	serviceConfig := new(integrationtypes.AWSCloudServiceConfig)
	err = integrationtypes.UnmarshalJSON(config, serviceConfig)
	if err != nil {
		return nil, err
	}

	if config != nil && serviceConfig.IsMetricsEnabled() {
		def.PopulateDashboardURLs(a.GetName(), serviceId)
	}

	return serviceConfig, nil
}

func (a *awsProvider) GetAvailableDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	return baseprovider.GetAvailableDashboards(ctx, &a.BaseCloudProvider, orgID, func(c *integrationtypes.AWSCloudServiceConfig) bool {
		return c.IsMetricsEnabled()
	})
}

func (a *awsProvider) GetDashboard(ctx context.Context, req *integrationtypes.GettableDashboard) (*dashboardtypes.Dashboard, error) {
	return a.BaseCloudProvider.GetDashboard(ctx, req, a.GetAvailableDashboards)
}

func (a *awsProvider) GenerateConnectionArtifact(ctx context.Context, req *integrationtypes.PostableConnectionArtifact) (any, error) {
	connection := new(integrationtypes.PostableAWSConnectionUrl)

	err := integrationtypes.UnmarshalJSON(req.Data, connection)
	if err != nil {
		return nil, err
	}

	if connection.AccountConfig != nil {
		for _, region := range connection.AccountConfig.EnabledRegions {
			if integrationtypes.ValidAWSRegions[region] {
				continue
			}

			return nil, errors.NewInvalidInputf(CodeInvalidAWSRegion, "invalid aws region: %s", region)
		}
	}

	config, err := integrationtypes.MarshalJSON(connection.AccountConfig)
	if err != nil {
		return nil, err
	}

	account, err := a.AccountsRepo.Upsert(
		ctx, req.OrgID, integrationtypes.CloudProviderAWS.String(), nil, config,
		nil, nil, nil,
	)
	if err != nil {
		return nil, err
	}

	agentVersion := "v0.0.8"
	if connection.AgentConfig.Version != "" {
		agentVersion = connection.AgentConfig.Version
	}

	baseURL := fmt.Sprintf("https://%s.console.aws.amazon.com/cloudformation/home",
		connection.AgentConfig.Region)
	u, _ := url.Parse(baseURL)

	q := u.Query()
	q.Set("region", connection.AgentConfig.Region)
	u.Fragment = "/stacks/quickcreate"

	u.RawQuery = q.Encode()

	q = u.Query()
	q.Set("stackName", "signoz-integration")
	q.Set("templateURL", fmt.Sprintf("https://signoz-integrations.s3.us-east-1.amazonaws.com/aws-quickcreate-template-%s.json", agentVersion))
	q.Set("param_SigNozIntegrationAgentVersion", agentVersion)
	q.Set("param_SigNozApiUrl", connection.AgentConfig.SigNozAPIUrl)
	q.Set("param_SigNozApiKey", connection.AgentConfig.SigNozAPIKey)
	q.Set("param_SigNozAccountId", account.ID.StringValue())
	q.Set("param_IngestionUrl", connection.AgentConfig.IngestionUrl)
	q.Set("param_IngestionKey", connection.AgentConfig.IngestionKey)

	return &integrationtypes.GettableAWSConnectionUrl{
		AccountId:     account.ID.StringValue(),
		ConnectionUrl: u.String() + "?&" + q.Encode(), // this format is required by AWS
	}, nil
}

func (a *awsProvider) UpdateServiceConfig(ctx context.Context, req *integrationtypes.PatchableServiceConfig) (any, error) {
	definition, err := a.ServiceDefinitions.GetServiceDefinition(ctx, req.ServiceId)
	if err != nil {
		return nil, err
	}

	serviceConfig := new(integrationtypes.UpdatableAWSCloudServiceConfig)
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

	err = integrationtypes.UnmarshalJSON(updatedConfig, serviceConfig)
	if err != nil {
		return nil, err
	}

	return &integrationtypes.PatchServiceConfigResponse{
		ServiceId: req.ServiceId,
		Config:    serviceConfig.Config,
	}, nil
}

func (a *awsProvider) UpdateAccountConfig(ctx context.Context, req *integrationtypes.PatchableAccountConfig) (any, error) {
	config := new(integrationtypes.PatchableAWSAccountConfig)

	err := integrationtypes.UnmarshalJSON(req.Data, config)
	if err != nil {
		return nil, err
	}

	if config.Config == nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "account config can't be null")
	}

	for _, region := range config.Config.EnabledRegions {
		if integrationtypes.ValidAWSRegions[region] {
			continue
		}

		return nil, errors.NewInvalidInputf(CodeInvalidAWSRegion, "invalid aws region: %s", region)
	}

	configBytes, err := integrationtypes.MarshalJSON(config.Config)
	if err != nil {
		return nil, err
	}

	// account must exist to update config, but it doesn't need to be connected
	_, err = a.AccountsRepo.Get(ctx, req.OrgID, a.GetName().String(), req.AccountId)
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
