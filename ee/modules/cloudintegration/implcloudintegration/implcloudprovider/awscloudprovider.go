package implcloudprovider

import (
	"context"
	"fmt"
	"net/url"
	"sort"

	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

type awscloudprovider struct {
	serviceDefinitions cloudintegrationtypes.ServiceDefinitionStore
}

func NewAWSCloudProvider(defStore cloudintegrationtypes.ServiceDefinitionStore) (cloudintegration.CloudProviderModule, error) {
	return &awscloudprovider{serviceDefinitions: defStore}, nil
}

// TODO: move URL construction logic to cloudintegrationtypes and add unit tests for it.
func (provider *awscloudprovider) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.GetConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	baseURL := fmt.Sprintf(cloudintegrationtypes.CloudFormationQuickCreateBaseURL.StringValue(), req.Config.AWS.DeploymentRegion)
	u, _ := url.Parse(baseURL)

	q := u.Query()
	q.Set("region", req.Config.AWS.DeploymentRegion)
	u.Fragment = "/stacks/quickcreate"

	u.RawQuery = q.Encode()

	q = u.Query()
	q.Set("stackName", cloudintegrationtypes.AgentCloudFormationBaseStackName.StringValue())
	q.Set("templateURL", fmt.Sprintf(cloudintegrationtypes.AgentCloudFormationTemplateS3Path.StringValue(), req.Config.AgentVersion))
	q.Set("param_SigNozIntegrationAgentVersion", req.Config.AgentVersion)
	q.Set("param_SigNozApiUrl", req.Credentials.SigNozAPIURL)
	q.Set("param_SigNozApiKey", req.Credentials.SigNozAPIKey)
	q.Set("param_SigNozAccountId", account.ID.StringValue())
	q.Set("param_IngestionUrl", req.Credentials.IngestionURL)
	q.Set("param_IngestionKey", req.Credentials.IngestionKey)

	return &cloudintegrationtypes.ConnectionArtifact{
		AWS: cloudintegrationtypes.NewAWSConnectionArtifact(u.String() + "?&" + q.Encode()), // this format is required by AWS
	}, nil
}

func (provider *awscloudprovider) ListServiceDefinitions(ctx context.Context) ([]*cloudintegrationtypes.ServiceDefinition, error) {
	return provider.serviceDefinitions.List(ctx, cloudintegrationtypes.CloudProviderTypeAWS)
}

func (provider *awscloudprovider) GetServiceDefinition(ctx context.Context, serviceID cloudintegrationtypes.ServiceID) (*cloudintegrationtypes.ServiceDefinition, error) {
	serviceDef, err := provider.serviceDefinitions.Get(ctx, cloudintegrationtypes.CloudProviderTypeAWS, serviceID)
	if err != nil {
		return nil, err
	}

	// override cloud integration dashboard id
	for index, dashboard := range serviceDef.Assets.Dashboards {
		serviceDef.Assets.Dashboards[index].ID = cloudintegrationtypes.GetCloudIntegrationDashboardID(cloudintegrationtypes.CloudProviderTypeAWS, serviceID.StringValue(), dashboard.ID)
	}

	return serviceDef, nil
}

func (provider *awscloudprovider) BuildIntegrationConfig(
	ctx context.Context,
	account *cloudintegrationtypes.Account,
	services []*cloudintegrationtypes.StorableCloudIntegrationService,
) (*cloudintegrationtypes.ProviderIntegrationConfig, error) {
	// Sort services for deterministic output
	sort.Slice(services, func(i, j int) bool {
		return services[i].Type.StringValue() < services[j].Type.StringValue()
	})

	compiledMetrics := new(cloudintegrationtypes.AWSMetricsCollectionStrategy)
	compiledLogs := new(cloudintegrationtypes.AWSLogsCollectionStrategy)
	var compiledS3Buckets map[string][]string

	for _, storedSvc := range services {
		svcCfg, err := cloudintegrationtypes.NewServiceConfigFromJSON(cloudintegrationtypes.CloudProviderTypeAWS, storedSvc.Config)
		if err != nil {
			return nil, err
		}

		svcDef, err := provider.GetServiceDefinition(ctx, storedSvc.Type)
		if err != nil {
			return nil, err
		}

		strategy := svcDef.TelemetryCollectionStrategy.AWS
		logsEnabled := svcCfg.IsLogsEnabled(cloudintegrationtypes.CloudProviderTypeAWS)

		// S3Sync: logs come directly from configured S3 buckets, not CloudWatch subscriptions
		if storedSvc.Type == cloudintegrationtypes.AWSServiceS3Sync {
			if logsEnabled && svcCfg.AWS.Logs.S3Buckets != nil {
				compiledS3Buckets = svcCfg.AWS.Logs.S3Buckets
			}
			// no need to go ahead as the code block specifically checks for the S3Sync service
			continue
		}

		if logsEnabled && strategy.Logs != nil {
			compiledLogs.Subscriptions = append(compiledLogs.Subscriptions, strategy.Logs.Subscriptions...)
		}

		metricsEnabled := svcCfg.IsMetricsEnabled(cloudintegrationtypes.CloudProviderTypeAWS)

		if metricsEnabled && strategy.Metrics != nil {
			compiledMetrics.StreamFilters = append(compiledMetrics.StreamFilters, strategy.Metrics.StreamFilters...)
		}
	}

	collectionStrategy := new(cloudintegrationtypes.AWSTelemetryCollectionStrategy)

	if len(compiledMetrics.StreamFilters) > 0 {
		collectionStrategy.Metrics = compiledMetrics
	}
	if len(compiledLogs.Subscriptions) > 0 {
		collectionStrategy.Logs = compiledLogs
	}
	if compiledS3Buckets != nil {
		collectionStrategy.S3Buckets = compiledS3Buckets
	}

	return &cloudintegrationtypes.ProviderIntegrationConfig{
		AWS: cloudintegrationtypes.NewAWSIntegrationConfig(account.Config.AWS.Regions, collectionStrategy),
	}, nil
}
