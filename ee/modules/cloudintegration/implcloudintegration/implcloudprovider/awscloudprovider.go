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

func (provider *awscloudprovider) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.ConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	baseURL := fmt.Sprintf("https://%s.console.aws.amazon.com/cloudformation/home", req.Config.Aws.DeploymentRegion)
	u, _ := url.Parse(baseURL)

	q := u.Query()
	q.Set("region", req.Config.Aws.DeploymentRegion)
	u.Fragment = "/stacks/quickcreate"

	u.RawQuery = q.Encode()

	q = u.Query()
	q.Set("stackName", "signoz-integration")
	q.Set("templateURL", fmt.Sprintf("https://signoz-integrations.s3.us-east-1.amazonaws.com/aws-quickcreate-template-%s.json", req.Config.AgentVersion))
	q.Set("param_SigNozIntegrationAgentVersion", req.Config.AgentVersion)
	q.Set("param_SigNozApiUrl", req.Credentials.SigNozAPIURL)
	q.Set("param_SigNozApiKey", req.Credentials.SigNozAPIKey)
	q.Set("param_SigNozAccountId", account.ID.StringValue())
	q.Set("param_IngestionUrl", req.Credentials.IngestionURL)
	q.Set("param_IngestionKey", req.Credentials.IngestionKey)

	return &cloudintegrationtypes.ConnectionArtifact{
		Aws: &cloudintegrationtypes.AWSConnectionArtifact{
			ConnectionURL: u.String() + "?&" + q.Encode(), // this format is required by AWS
		},
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

	compiledMetrics := &cloudintegrationtypes.AWSMetricsStrategy{}
	compiledLogs := &cloudintegrationtypes.AWSLogsStrategy{}
	var compiledS3Buckets map[string][]string

	for _, storedSvc := range services {
		svcCfg, err := cloudintegrationtypes.NewServiceConfigFromJSON(cloudintegrationtypes.CloudProviderTypeAWS, storedSvc.Config)
		if err != nil || svcCfg == nil || svcCfg.AWS == nil {
			continue
		}

		svcDef, err := provider.GetServiceDefinition(ctx, storedSvc.Type)
		if err != nil || svcDef == nil || svcDef.Strategy == nil || svcDef.Strategy.AWS == nil {
			continue
		}

		strategy := svcDef.Strategy.AWS

		// S3Sync: logs come directly from configured S3 buckets, not CloudWatch subscriptions
		if storedSvc.Type == cloudintegrationtypes.AWSServiceS3Sync {
			if svcCfg.AWS.Logs != nil && svcCfg.AWS.Logs.Enabled && svcCfg.AWS.Logs.S3Buckets != nil {
				compiledS3Buckets = svcCfg.AWS.Logs.S3Buckets
			}
			continue
		}

		if svcCfg.AWS.Logs != nil && svcCfg.AWS.Logs.Enabled && strategy.Logs != nil {
			compiledLogs.Subscriptions = append(compiledLogs.Subscriptions, strategy.Logs.Subscriptions...)
		}

		if svcCfg.AWS.Metrics != nil && svcCfg.AWS.Metrics.Enabled && strategy.Metrics != nil {
			compiledMetrics.StreamFilters = append(compiledMetrics.StreamFilters, strategy.Metrics.StreamFilters...)
		}
	}

	awsTelemetry := &cloudintegrationtypes.AWSCollectionStrategy{}
	if len(compiledMetrics.StreamFilters) > 0 {
		awsTelemetry.Metrics = compiledMetrics
	}
	if len(compiledLogs.Subscriptions) > 0 {
		awsTelemetry.Logs = compiledLogs
	}
	if compiledS3Buckets != nil {
		awsTelemetry.S3Buckets = compiledS3Buckets
	}

	enabledRegions := []string{}
	if account.Config != nil && account.Config.AWS != nil && account.Config.AWS.Regions != nil {
		enabledRegions = account.Config.AWS.Regions
	}

	return &cloudintegrationtypes.ProviderIntegrationConfig{
		AWS: &cloudintegrationtypes.AWSIntegrationConfig{
			EnabledRegions: enabledRegions,
			Telemetry:      awsTelemetry,
		},
	}, nil
}
