package implcloudprovider

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"

	"github.com/SigNoz/signoz/pkg/errors"
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
	return provider.serviceDefinitions.Get(ctx, cloudintegrationtypes.CloudProviderTypeAWS, serviceID)
}

func (provider *awscloudprovider) StorableConfigFromServiceConfig(ctx context.Context, cfg *cloudintegrationtypes.ServiceConfig, supported cloudintegrationtypes.SupportedSignals) (string, error) {
	if cfg == nil || cfg.AWS == nil {
		return "", nil
	}
	// Strip signal configs the service does not support before storing.
	if !supported.Logs {
		cfg.AWS.Logs = nil
	}
	if !supported.Metrics {
		cfg.AWS.Metrics = nil
	}
	b, err := json.Marshal(cfg.AWS)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (provider *awscloudprovider) ServiceConfigFromStorableServiceConfig(ctx context.Context, config string) (*cloudintegrationtypes.ServiceConfig, error) {
	if config == "" {
		return nil, errors.NewInternalf(errors.CodeInternal, "service config is empty")
	}

	var awsCfg cloudintegrationtypes.AWSServiceConfig
	if err := json.Unmarshal([]byte(config), &awsCfg); err != nil {
		return nil, err
	}

	return &cloudintegrationtypes.ServiceConfig{AWS: &awsCfg}, nil
}

func (provider *awscloudprovider) IsServiceEnabled(ctx context.Context, config *cloudintegrationtypes.ServiceConfig) bool {
	if config == nil || config.AWS == nil {
		return false
	}
	logsEnabled := config.AWS.Logs != nil && config.AWS.Logs.Enabled
	metricsEnabled := config.AWS.Metrics != nil && config.AWS.Metrics.Enabled
	return logsEnabled || metricsEnabled
}

func (provider *awscloudprovider) IsMetricsEnabled(ctx context.Context, config *cloudintegrationtypes.ServiceConfig) bool {
	if config == nil || config.AWS == nil {
		return false
	}
	return awsMetricsEnabled(config.AWS)
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
		svcCfg, err := provider.ServiceConfigFromStorableServiceConfig(ctx, storedSvc.Config)
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
			if awsLogsEnabled(svcCfg.AWS) && svcCfg.AWS.Logs.S3Buckets != nil {
				compiledS3Buckets = svcCfg.AWS.Logs.S3Buckets
			}
			continue
		}

		if awsLogsEnabled(svcCfg.AWS) && strategy.Logs != nil {
			compiledLogs.Subscriptions = append(compiledLogs.Subscriptions, strategy.Logs.Subscriptions...)
		}

		if awsMetricsEnabled(svcCfg.AWS) && strategy.Metrics != nil {
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

// awsLogsEnabled returns true if the AWS service config has logs explicitly enabled.
func awsLogsEnabled(cfg *cloudintegrationtypes.AWSServiceConfig) bool {
	return cfg.Logs != nil && cfg.Logs.Enabled
}

// awsMetricsEnabled returns true if the AWS service config has metrics explicitly enabled.
func awsMetricsEnabled(cfg *cloudintegrationtypes.AWSServiceConfig) bool {
	return cfg.Metrics != nil && cfg.Metrics.Enabled
}
