package implawsprovider

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"slices"

	"golang.org/x/exp/maps"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/baseprovider"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	integrationstore "github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	CodeInvalidAWSRegion = errors.MustNewCode("invalid_aws_region")
)

type awsProvider struct {
	baseprovider.BaseCloudProvider[*integrationtypes.AWSDefinition, *integrationtypes.AWSServiceConfig]
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
		BaseCloudProvider: baseprovider.BaseCloudProvider[*integrationtypes.AWSDefinition, *integrationtypes.AWSServiceConfig]{
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
	return baseprovider.AgentCheckIn(
		&a.BaseCloudProvider,
		ctx,
		req,
		a.getAWSAgentConfig,
	)
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

		serviceConfig := new(integrationtypes.AWSServiceConfig)
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
	svcConfigs := make(map[string]*integrationtypes.AWSServiceConfig)
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
			serviceConfig := new(integrationtypes.AWSServiceConfig)
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

	details.Definition = *awsDefinition
	if req.CloudAccountID == nil {
		return details, nil
	}

	config, err := a.GetServiceConfig(ctx, awsDefinition, req.OrgID, req.ServiceId, *req.CloudAccountID)
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

func (a *awsProvider) UpdateAccountConfig(ctx context.Context, orgId valuer.UUID, accountId string, configBytes []byte) (any, error) {
	config := new(integrationtypes.UpdatableAWSAccountConfig)

	err := integrationtypes.UnmarshalJSON(configBytes, config)
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

	// account must exist to update config, but it doesn't need to be connected
	_, err = a.AccountsRepo.Get(ctx, orgId.String(), a.GetName().String(), accountId)
	if err != nil {
		return nil, err
	}

	configBytes, err = integrationtypes.MarshalJSON(config.Config)
	if err != nil {
		return nil, err
	}

	accountRecord, err := a.AccountsRepo.Upsert(
		ctx, orgId.String(), a.GetName().String(), &accountId, configBytes, nil, nil, nil,
	)
	if err != nil {
		return nil, err
	}

	return accountRecord.Account(a.GetName()), nil
}
