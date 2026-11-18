package implcloudprovider

import (
	"context"
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

func (provider *awscloudprovider) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.GetConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	connectionArtifact, err := cloudintegrationtypes.NewAWSConnectionArtifact(account.ID, req.Config.AgentVersion, req.Credentials, req.Config.AWS.DeploymentRegion)
	if err != nil {
		return nil, err
	}

	return &cloudintegrationtypes.ConnectionArtifact{
		AWS: connectionArtifact,
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
