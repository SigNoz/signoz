package cloudintegrationtypes

import (
	"fmt"
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

type Service struct {
	ServiceDefinition
	ServiceConfig *ServiceConfig `json:"serviceConfig" required:"false" nullable:"false"`
}

type GettableService = Service

type UpdatableService struct {
	Config *ServiceConfig `json:"config" required:"true" nullable:"false"`
}

type ServiceDefinition struct {
	ServiceDefinitionMetadata
	Overview         string              `json:"overview" required:"true"` // markdown
	Assets           Assets              `json:"assets" required:"true"`
	SupportedSignals SupportedSignals    `json:"supported_signals" required:"true"`
	DataCollected    DataCollected       `json:"dataCollected" required:"true"`
	Strategy         *CollectionStrategy `json:"telemetryCollectionStrategy" required:"true" nullable:"false"`
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

// CollectionStrategy is cloud provider specific configuration for signal collection,
// this is used by agent to understand the nitty-gritty for collecting telemetry for the cloud provider.
type CollectionStrategy struct {
	AWS *AWSCollectionStrategy `json:"aws" required:"true" nullable:"false"`
}

type AWSServiceConfig struct {
	Logs    *AWSServiceLogsConfig    `json:"logs"`
	Metrics *AWSServiceMetricsConfig `json:"metrics"`
}

// AWSServiceLogsConfig is AWS specific logs config for a service
// NOTE: the JSON keys are snake case for backward compatibility with existing agents.
type AWSServiceLogsConfig struct {
	Enabled   bool                `json:"enabled"`
	S3Buckets map[string][]string `json:"s3_buckets,omitempty"`
}

type AWSServiceMetricsConfig struct {
	Enabled bool `json:"enabled"`
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

// AWSCollectionStrategy represents signal collection strategy for AWS services.
// this is AWS specific.
// NOTE: this structure is still using snake case, for backward compatibility,
// with existing agents.
type AWSCollectionStrategy struct {
	Metrics   *AWSMetricsStrategy `json:"aws_metrics,omitempty"`
	Logs      *AWSLogsStrategy    `json:"aws_logs,omitempty"`
	S3Buckets map[string][]string `json:"s3_buckets,omitempty"` // Only available in S3 Sync Service Type in AWS
}

// AWSMetricsStrategy represents metrics collection strategy for AWS services.
// this is AWS specific.
// NOTE: this structure is still using snake case, for backward compatibility,
// with existing agents.
type AWSMetricsStrategy struct {
	// to be used as https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-metricstream.html#cfn-cloudwatch-metricstream-includefilters
	StreamFilters []struct {
		// json tags here are in the shape expected by AWS API as detailed at
		// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudwatch-metricstream-metricstreamfilter.html
		Namespace   string   `json:"Namespace"`
		MetricNames []string `json:"MetricNames,omitempty"`
	} `json:"cloudwatch_metric_stream_filters"`
}

// AWSLogsStrategy represents logs collection strategy for AWS services.
// this is AWS specific.
// NOTE: this structure is still using snake case, for backward compatibility,
// with existing agents.
type AWSLogsStrategy struct {
	Subscriptions []struct {
		// subscribe to all logs groups with specified prefix.
		// eg: `/aws/rds/`
		LogGroupNamePrefix string `json:"log_group_name_prefix"`

		// https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
		// "" implies no filtering is required.
		FilterPattern string `json:"filter_pattern"`
	} `json:"cloudwatch_logs_subscriptions"`
}

// Dashboard represents a dashboard definition for cloud integration.
// This is used to show available pre-made dashboards for a service,
// hence has additional fields like id, title and description
type Dashboard struct {
	ID          string                               `json:"id"`
	Title       string                               `json:"title"`
	Description string                               `json:"description"`
	Definition  dashboardtypes.StorableDashboardData `json:"definition,omitempty"`
}

// UTILS

// GetCloudIntegrationDashboardID returns the dashboard id for a cloud integration, given the cloud provider, service id, and dashboard id.
// This is used to generate unique dashboard ids for cloud integration, and also to parse the dashboard id to get the cloud provider and service id when needed.
func GetCloudIntegrationDashboardID(cloudProvider CloudProviderType, svcID, dashboardID string) string {
	return fmt.Sprintf("cloud-integration--%s--%s--%s", cloudProvider, svcID, dashboardID)
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
		author := fmt.Sprintf("%s-integration", cloudProvider)
		dashboards = append(dashboards, &dashboardtypes.Dashboard{
			ID:     GetCloudIntegrationDashboardID(cloudProvider, svcID, d.ID),
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
