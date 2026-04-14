package cloudintegrationtypes

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var ErrCodeInvalidServiceID = errors.MustNewCode("invalid_service_id")

type CloudIntegrationService struct {
	types.Identifiable
	types.TimeAuditable
	Type               ServiceID      `json:"type"`
	Config             *ServiceConfig `json:"config"`
	CloudIntegrationID valuer.UUID    `json:"cloudIntegrationId"`
}

type ServiceConfig struct {
	// required till new providers are added
	AWS *AWSServiceConfig `json:"aws" required:"true" nullable:"false"`
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

// ServiceMetadata helps to quickly list available services and whether it is enabled or not.
// As getting complete service definition is a heavy operation and the response is also large,
// initial integration page load can be very slow.
type ServiceMetadata struct {
	ServiceDefinitionMetadata
	// if the service is enabled for the account
	Enabled bool `json:"enabled" required:"true"`
}

// ServiceDefinitionMetadata represents service definition metadata. This is useful for showing service tab in frontend.
type ServiceDefinitionMetadata struct {
	ID    string `json:"id" required:"true"`
	Title string `json:"title" required:"true"`
	Icon  string `json:"icon" required:"true"`
}

type GettableServicesMetadata struct {
	Services []*ServiceMetadata `json:"services" required:"true" nullable:"false"`
}

type ListServicesMetadataParams struct {
	CloudIntegrationID valuer.UUID `query:"cloud_integration_id" required:"false"`
}

// Service represents a cloud integration service with its definition,
// cloud integration service is non nil only when the service entry exists in DB with ANY config (enabled or disabled).
type Service struct {
	ServiceDefinition
	CloudIntegrationService *CloudIntegrationService `json:"cloudIntegrationService" required:"true" nullable:"true"`
}

type GetServiceParams struct {
	CloudIntegrationID valuer.UUID `query:"cloud_integration_id" required:"false"`
}

type UpdatableService struct {
	Config *ServiceConfig `json:"config" required:"true" nullable:"false"`
}

type ServiceDefinition struct {
	ServiceDefinitionMetadata
	Overview                    string                       `json:"overview" required:"true"` // markdown
	Assets                      Assets                       `json:"assets" required:"true"`
	SupportedSignals            SupportedSignals             `json:"supportedSignals" required:"true"`
	DataCollected               DataCollected                `json:"dataCollected" required:"true"`
	TelemetryCollectionStrategy *TelemetryCollectionStrategy `json:"telemetryCollectionStrategy" required:"true" nullable:"false"`
}

// SupportedSignals for cloud provider's service.
type SupportedSignals struct {
	Logs    bool `json:"logs"`
	Metrics bool `json:"metrics"`
}

// DataCollected is curated static list of metrics and logs, this is shown as part of service overview.
type DataCollected struct {
	Logs    []CollectedLogAttribute `json:"logs"`
	Metrics []CollectedMetric       `json:"metrics"`
}

// TelemetryCollectionStrategy is cloud provider specific configuration for signal collection,
// this is used by agent to understand the nitty-gritty for collecting telemetry for the cloud provider.
type TelemetryCollectionStrategy struct {
	AWS *AWSTelemetryCollectionStrategy `json:"aws" required:"true" nullable:"false"`
}

// Assets represents the collection of dashboards.
type Assets struct {
	Dashboards []Dashboard `json:"dashboards"`
}

// CollectedLogAttribute represents a log attribute that is present in all log entries for a service,
// this is shown as part of service overview.
type CollectedLogAttribute struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
}

// CollectedMetric represents a metric that is collected for a service, this is shown as part of service overview.
type CollectedMetric struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Unit        string `json:"unit"`
	Description string `json:"description"`
}

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

// Dashboard represents a dashboard definition for cloud integration.
// This is used to show available pre-made dashboards for a service,
// hence has additional fields like id, title and description.
type Dashboard struct {
	ID          string                               `json:"id"`
	Title       string                               `json:"title"`
	Description string                               `json:"description"`
	Definition  dashboardtypes.StorableDashboardData `json:"definition,omitempty"`
}

func NewCloudIntegrationService(serviceID ServiceID, cloudIntegrationID valuer.UUID, config *ServiceConfig) *CloudIntegrationService {
	return &CloudIntegrationService{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Type:               serviceID,
		Config:             config,
		CloudIntegrationID: cloudIntegrationID,
	}
}

func NewCloudIntegrationServiceFromStorable(stored *StorableCloudIntegrationService, config *ServiceConfig) *CloudIntegrationService {
	return &CloudIntegrationService{
		Identifiable:       stored.Identifiable,
		TimeAuditable:      stored.TimeAuditable,
		Type:               stored.Type,
		Config:             config,
		CloudIntegrationID: stored.CloudIntegrationID,
	}
}

func NewServiceMetadata(definition ServiceDefinition, enabled bool) *ServiceMetadata {
	return &ServiceMetadata{
		ServiceDefinitionMetadata: definition.ServiceDefinitionMetadata,
		Enabled:                   enabled,
	}
}

func NewService(def ServiceDefinition, storableService *CloudIntegrationService) *Service {
	return &Service{
		ServiceDefinition:       def,
		CloudIntegrationService: storableService,
	}
}

func NewGettableServicesMetadata(services []*ServiceMetadata) *GettableServicesMetadata {
	return &GettableServicesMetadata{
		Services: services,
	}
}

func NewServiceConfigFromJSON(provider CloudProviderType, jsonString string) (*ServiceConfig, error) {
	storableServiceConfig, err := newStorableServiceConfigFromJSON(provider, jsonString)
	if err != nil {
		return nil, err
	}

	switch provider {
	case CloudProviderTypeAWS:
		awsServiceConfig := new(AWSServiceConfig)

		if storableServiceConfig.AWS.Logs != nil {
			awsServiceConfig.Logs = &AWSServiceLogsConfig{
				Enabled:   storableServiceConfig.AWS.Logs.Enabled,
				S3Buckets: storableServiceConfig.AWS.Logs.S3Buckets,
			}
		}

		if storableServiceConfig.AWS.Metrics != nil {
			awsServiceConfig.Metrics = &AWSServiceMetricsConfig{
				Enabled: storableServiceConfig.AWS.Metrics.Enabled,
			}
		}

		return &ServiceConfig{AWS: awsServiceConfig}, nil
	default:
		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}

// Update sets the service config.
func (service *CloudIntegrationService) Update(provider CloudProviderType, serviceID ServiceID, config *ServiceConfig) error {
	switch provider {
	case CloudProviderTypeAWS:
		if config.AWS == nil {
			return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "AWS config is required for AWS service")
		}

		if serviceID == AWSServiceS3Sync {
			if config.AWS.Logs == nil || config.AWS.Logs.S3Buckets == nil {
				return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "AWS S3 Sync service requires S3 bucket configuration for logs")
			}
		}

		// other validations happen in newStorableServiceConfig
	default:
		return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}

	service.Config = config
	service.UpdatedAt = time.Now()
	return nil
}

// IsServiceEnabled returns true if the service has at least one signal (logs or metrics) enabled
// for the given cloud provider.
func (config *ServiceConfig) IsServiceEnabled(provider CloudProviderType) bool {
	switch provider {
	case CloudProviderTypeAWS:
		logsEnabled := config.AWS.Logs != nil && config.AWS.Logs.Enabled
		metricsEnabled := config.AWS.Metrics != nil && config.AWS.Metrics.Enabled
		return logsEnabled || metricsEnabled
	default:
		return false
	}
}

// IsMetricsEnabled returns true if metrics are explicitly enabled for the given cloud provider.
// Used to gate dashboard availability — dashboards are only shown when metrics are enabled.
func (config *ServiceConfig) IsMetricsEnabled(provider CloudProviderType) bool {
	switch provider {
	case CloudProviderTypeAWS:
		return config.AWS.Metrics != nil && config.AWS.Metrics.Enabled
	default:
		return false
	}
}

// IsLogsEnabled returns true if logs are explicitly enabled for the given cloud provider.
func (config *ServiceConfig) IsLogsEnabled(provider CloudProviderType) bool {
	switch provider {
	case CloudProviderTypeAWS:
		return config.AWS.Logs != nil && config.AWS.Logs.Enabled
	default:
		return false
	}
}

func (config *ServiceConfig) ToJSON(provider CloudProviderType, serviceID ServiceID, supportedSignals *SupportedSignals) ([]byte, error) {
	storableServiceConfig, err := newStorableServiceConfig(provider, serviceID, config, supportedSignals)
	if err != nil {
		return nil, err
	}

	return storableServiceConfig.toJSON(provider)
}

func (updatableService *UpdatableService) UnmarshalJSON(data []byte) error {
	type Alias UpdatableService

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Config == nil {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "config is required")
	}

	*updatableService = UpdatableService(temp)
	return nil
}

// UTILITIES

// GetCloudIntegrationDashboardID returns the dashboard id for a cloud integration, given the cloud provider, service id, and dashboard id.
// This is used to generate unique dashboard ids for cloud integration, and also to parse the dashboard id to get the cloud provider and service id when needed.
func GetCloudIntegrationDashboardID(cloudProvider CloudProviderType, svcID, dashboardID string) string {
	return fmt.Sprintf("cloud-integration--%s--%s--%s", cloudProvider.StringValue(), svcID, dashboardID)
}

// ParseCloudIntegrationDashboardID parses a dashboard id generated by GetCloudIntegrationDashboardID
// into its constituent parts (cloudProvider, serviceID, dashboardID).
func ParseCloudIntegrationDashboardID(id string) (CloudProviderType, string, string, error) {
	parts := strings.SplitN(id, "--", 4)
	if len(parts) != 4 || parts[0] != "cloud-integration" {
		return CloudProviderType{}, "", "", errors.New(errors.TypeNotFound, ErrCodeCloudIntegrationNotFound, "invalid cloud integration dashboard id")
	}
	provider, err := NewCloudProvider(parts[1])
	if err != nil {
		return CloudProviderType{}, "", "", err
	}
	return provider, parts[2], parts[3], nil
}

// GetDashboardsFromAssets returns the list of dashboards for the cloud provider service from definition.
func GetDashboardsFromAssets(
	svcID string,
	orgID valuer.UUID,
	cloudProvider CloudProviderType,
	createdAt time.Time,
	assets Assets,
) []*dashboardtypes.Dashboard {
	dashboards := make([]*dashboardtypes.Dashboard, 0)

	for _, d := range assets.Dashboards {
		author := fmt.Sprintf("%s-integration", cloudProvider.StringValue())
		dashboards = append(dashboards, &dashboardtypes.Dashboard{
			ID:     d.ID,
			Locked: true,
			OrgID:  orgID,
			Data:   d.Definition,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: createdAt,
				UpdatedAt: createdAt,
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: author,
				UpdatedBy: author,
			},
		})
	}

	return dashboards
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
