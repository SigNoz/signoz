package cloudintegrationtypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	CloudFormationQuickCreateBaseURL  = valuer.NewString("https://%s.console.aws.amazon.com/cloudformation/home")
	AgentCloudFormationTemplateS3Path = valuer.NewString("https://signoz-integrations.s3.us-east-1.amazonaws.com/aws-quickcreate-template-%s.json")
	AgentCloudFormationBaseStackName  = valuer.NewString("signoz-integration")
)

type AWSPostableAccountConfig struct {
	DeploymentRegion string   `json:"deploymentRegion" required:"true"`
	Regions          []string `json:"regions" required:"true" nullable:"false"`
}

type AWSConnectionArtifact struct {
	ConnectionURL string `json:"connectionUrl" required:"true"`
}

type AWSAccountConfig struct {
	Regions []string `json:"regions" required:"true" nullable:"false"`
}

type UpdatableAWSAccountConfig = AWSAccountConfig

// OldAWSCollectionStrategy is the backward-compatible snake_case form of AWSCollectionStrategy,
// used in the legacy integration_config response field for older agents.
type OldAWSCollectionStrategy struct {
	Provider  string                 `json:"provider"`
	Metrics   *OldAWSMetricsStrategy `json:"aws_metrics,omitempty"`
	Logs      *OldAWSLogsStrategy    `json:"aws_logs,omitempty"`
	S3Buckets map[string][]string    `json:"s3_buckets,omitempty"`
}

// OldAWSMetricsStrategy is the snake_case form of AWSMetricsStrategy for older agents.
type OldAWSMetricsStrategy struct {
	StreamFilters []struct {
		Namespace   string   `json:"Namespace"`
		MetricNames []string `json:"MetricNames,omitempty"`
	} `json:"cloudwatch_metric_stream_filters"`
}

// OldAWSLogsStrategy is the snake_case form of AWSLogsStrategy for older agents.
type OldAWSLogsStrategy struct {
	Subscriptions []struct {
		LogGroupNamePrefix string `json:"log_group_name_prefix"`
		FilterPattern      string `json:"filter_pattern"`
	} `json:"cloudwatch_logs_subscriptions"`
}

type AWSIntegrationConfig struct {
	EnabledRegions              []string                        `json:"enabledRegions" required:"true" nullable:"false"`
	TelemetryCollectionStrategy *AWSTelemetryCollectionStrategy `json:"telemetryCollectionStrategy" required:"true" nullable:"false"`
}

// AWSTelemetryCollectionStrategy represents signal collection strategy for AWS services.
type AWSTelemetryCollectionStrategy struct {
	Metrics   *AWSMetricsCollectionStrategy `json:"metrics,omitempty" required:"false" nullable:"false"`
	Logs      *AWSLogsCollectionStrategy    `json:"logs,omitempty" required:"false" nullable:"false"`
	S3Buckets map[string][]string           `json:"s3Buckets,omitempty" required:"false"` // Only available in S3 Sync Service Type in AWS
}

// AWSMetricsCollectionStrategy represents metrics collection strategy for AWS services.
type AWSMetricsCollectionStrategy struct {
	// to be used as https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-metricstream.html#cfn-cloudwatch-metricstream-includefilters
	StreamFilters []*AWSCloudWatchMetricStreamFilter `json:"streamFilters" required:"true" nullable:"false"`
}

type AWSCloudWatchMetricStreamFilter struct {
	// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudwatch-metricstream-metricstreamfilter.html
	Namespace   string   `json:"namespace" required:"true"`
	MetricNames []string `json:"metricNames,omitempty" required:"false" nullable:"false"`
}

// AWSLogsCollectionStrategy represents logs collection strategy for AWS services.
type AWSLogsCollectionStrategy struct {
	Subscriptions []*AWSCloudWatchLogsSubscription `json:"subscriptions" required:"true" nullable:"false"`
}

type AWSCloudWatchLogsSubscription struct {
	// subscribe to all logs groups with specified prefix.
	// eg: `/aws/rds/`
	LogGroupNamePrefix string `json:"logGroupNamePrefix" required:"true"`

	// https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
	// "" implies no filtering is required
	FilterPattern string `json:"filterPattern" required:"true"`
}

type AWSServiceConfig struct {
	Logs    *AWSServiceLogsConfig    `json:"logs"`
	Metrics *AWSServiceMetricsConfig `json:"metrics"`
}

// AWSServiceLogsConfig is AWS specific logs config for a service
// NOTE: the JSON keys are snake case for backward compatibility with existing agents.
type AWSServiceLogsConfig struct {
	Enabled   bool                `json:"enabled"`
	S3Buckets map[string][]string `json:"s3Buckets,omitempty"`
}

type AWSServiceMetricsConfig struct {
	Enabled bool `json:"enabled"`
}

func NewAWSConnectionArtifact(connectionURL string) *AWSConnectionArtifact {
	return &AWSConnectionArtifact{
		ConnectionURL: connectionURL,
	}
}

func NewAWSIntegrationConfig(enabledRegions []string, telemetryCollectionStrategy *AWSTelemetryCollectionStrategy) *AWSIntegrationConfig {
	return &AWSIntegrationConfig{
		EnabledRegions:              enabledRegions,
		TelemetryCollectionStrategy: telemetryCollectionStrategy,
	}
}

// awsOlderIntegrationConfig converts a ProviderIntegrationConfig into the legacy snake_case
// IntegrationConfig format consumed by older AWS agents. Returns nil if AWS config is absent.
func awsOlderIntegrationConfig(cfg *ProviderIntegrationConfig) *IntegrationConfig {
	if cfg == nil || cfg.AWS == nil {
		return nil
	}
	awsCfg := cfg.AWS

	older := &IntegrationConfig{
		EnabledRegions: awsCfg.EnabledRegions,
	}

	if awsCfg.TelemetryCollectionStrategy == nil {
		return older
	}

	// Older agents expect a "provider" field and fully snake_case keys inside telemetry.
	oldTelemetry := &OldAWSCollectionStrategy{
		Provider:  CloudProviderTypeAWS.StringValue(),
		S3Buckets: awsCfg.TelemetryCollectionStrategy.S3Buckets,
	}

	if awsCfg.TelemetryCollectionStrategy.Metrics != nil {
		// Convert camelCase cloudwatchMetricStreamFilters → snake_case cloudwatch_metric_stream_filters
		oldMetrics := &OldAWSMetricsStrategy{}
		for _, f := range awsCfg.TelemetryCollectionStrategy.Metrics.StreamFilters {
			oldMetrics.StreamFilters = append(oldMetrics.StreamFilters, struct {
				Namespace   string   `json:"Namespace"`
				MetricNames []string `json:"MetricNames,omitempty"`
			}{Namespace: f.Namespace, MetricNames: f.MetricNames})
		}
		oldTelemetry.Metrics = oldMetrics
	}

	if awsCfg.TelemetryCollectionStrategy.Logs != nil {
		// Convert camelCase cloudwatchLogsSubscriptions → snake_case cloudwatch_logs_subscriptions
		oldLogs := &OldAWSLogsStrategy{}
		for _, s := range awsCfg.TelemetryCollectionStrategy.Logs.Subscriptions {
			oldLogs.Subscriptions = append(oldLogs.Subscriptions, struct {
				LogGroupNamePrefix string `json:"log_group_name_prefix"`
				FilterPattern      string `json:"filter_pattern"`
			}{LogGroupNamePrefix: s.LogGroupNamePrefix, FilterPattern: s.FilterPattern})
		}
		oldTelemetry.Logs = oldLogs
	}

	older.Telemetry = oldTelemetry
	return older
}
