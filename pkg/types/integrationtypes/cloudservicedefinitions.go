package integrationtypes

import (
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const (
	S3Sync = "s3sync"
)

// Generic interface for cloud service definition.
// This is implemented by AWSDefinition and AzureDefinition, which represent service definitions for AWS and Azure respectively.
// Generics work well so far because service definitions share a similar logic.
// We dont want to over-do generics as well, if the service definitions functionally diverge in the future consider breaking generics.
type Definition interface {
	GetId() string
	Validate() error
	PopulateDashboardURLs(cloudProvider CloudProviderType, svcId string)
	GetIngestionStatusCheck() *IngestionStatusCheck
	GetAssets() Assets
}

// AWSDefinition represents AWS Service definition, which includes collection strategy, dashboards and meta info for integration
type AWSDefinition = ServiceDefinition[AWSCollectionStrategy]

// AzureDefinition represents Azure Service definition, which includes collection strategy, dashboards and meta info for integration
type AzureDefinition = ServiceDefinition[AzureCollectionStrategy]

// Making AWSDefinition and AzureDefinition satisfy Definition interface, so that they can be used in a generic way
var _ Definition = &AWSDefinition{}
var _ Definition = &AzureDefinition{}

// ServiceDefinition represents generic struct for cloud service, regardless of the cloud provider.
// this struct must satify Definition interface.
// StrategyT is of either AWSCollectionStrategy or AzureCollectionStrategy, depending on the cloud provider.
type ServiceDefinition[StrategyT any] struct {
	DefinitionMetadata
	Overview             string                `json:"overview"` // markdown
	Assets               Assets                `json:"assets"`
	SupportedSignals     SupportedSignals      `json:"supported_signals"`
	DataCollected        DataCollected         `json:"data_collected"`
	IngestionStatusCheck *IngestionStatusCheck `json:"ingestion_status_check,omitempty"`
	Strategy             *StrategyT            `json:"telemetry_collection_strategy"`
}

// Following methods are quite self explanatory, they are just to satisfy the Definition interface and provide some utility functions for service definitions.
func (def *ServiceDefinition[StrategyT]) GetId() string {
	return def.Id
}

func (def *ServiceDefinition[StrategyT]) Validate() error {
	seenDashboardIds := map[string]interface{}{}

	if def.Strategy == nil {
		return errors.NewInternalf(errors.CodeInternal, "telemetry_collection_strategy is required")
	}

	for _, dd := range def.Assets.Dashboards {
		if _, seen := seenDashboardIds[dd.Id]; seen {
			return errors.NewInternalf(errors.CodeInternal, "multiple dashboards found with id %s", dd.Id)
		}
		seenDashboardIds[dd.Id] = nil
	}

	return nil
}

func (def *ServiceDefinition[StrategyT]) PopulateDashboardURLs(cloudProvider CloudProviderType, svcId string) {
	for i := range def.Assets.Dashboards {
		dashboardId := def.Assets.Dashboards[i].Id
		url := "/dashboard/" + GetCloudIntegrationDashboardID(cloudProvider, svcId, dashboardId)
		def.Assets.Dashboards[i].Url = url
	}
}

func (def *ServiceDefinition[StrategyT]) GetIngestionStatusCheck() *IngestionStatusCheck {
	return def.IngestionStatusCheck
}

func (def *ServiceDefinition[StrategyT]) GetAssets() Assets {
	return def.Assets
}

// DefinitionMetadata represents service definition metadata. This is useful for showing service overview
type DefinitionMetadata struct {
	Id    string `json:"id"`
	Title string `json:"title"`
	Icon  string `json:"icon"`
}

// IngestionStatusCheckCategory represents a category of ingestion status check. Applies for both metrics and logs.
// A category can be "Overview" of metrics or "Enhanced" Metrics for AWS, and "Transaction" or "Capacity" metrics for Azure.
// Each category can have multiple checks (AND logic), if all checks pass,
// then we can be sure that data is being ingested for that category of the signal
type IngestionStatusCheckCategory struct {
	Category    string                           `json:"category"`
	DisplayName string                           `json:"display_name"`
	Checks      []*IngestionStatusCheckAttribute `json:"checks"`
}

// IngestionStatusCheckAttribute represents a check or condition for ingestion status.
// Key can be metric name or part of log message
type IngestionStatusCheckAttribute struct {
	Key        string                                 `json:"key"` // OPTIONAL search key (metric name or log message)
	Attributes []*IngestionStatusCheckAttributeFilter `json:"attributes"`
}

// IngestionStatusCheck represents combined checks for metrics and logs for a service
type IngestionStatusCheck struct {
	Metrics []*IngestionStatusCheckCategory `json:"metrics"`
	Logs    []*IngestionStatusCheckCategory `json:"logs"`
}

// IngestionStatusCheckAttributeFilter represents filter for a check, which can be used to filter specific log messages or metrics with specific attributes.
// For example, we can use it to filter logs with specific log level or metrics with specific dimensions.
type IngestionStatusCheckAttributeFilter struct {
	Name     string `json:"name"`
	Operator string `json:"operator"`
	Value    string `json:"value"` // OPTIONAL
}

// Assets represents the collection of dashboards
type Assets struct {
	Dashboards []Dashboard `json:"dashboards"`
}

// SupportedSignals for cloud provider's service
type SupportedSignals struct {
	Logs    bool `json:"logs"`
	Metrics bool `json:"metrics"`
}

// DataCollected is curated static list of metrics and logs, this is shown as part of service overview
type DataCollected struct {
	Logs    []CollectedLogAttribute `json:"logs"`
	Metrics []CollectedMetric       `json:"metrics"`
}

// CollectedLogAttribute represents a log attribute that is present in all log entries for a service,
// this is shown as part of service overview
type CollectedLogAttribute struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
}

// CollectedMetric represents a metric that is collected for a service, this is shown as part of service overview
type CollectedMetric struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Unit        string `json:"unit"`
	Description string `json:"description"`
}

// AWSCollectionStrategy represents signal collection strategy for AWS services.
// this is AWS specific.
type AWSCollectionStrategy struct {
	Metrics   *AWSMetricsStrategy `json:"aws_metrics,omitempty"`
	Logs      *AWSLogsStrategy    `json:"aws_logs,omitempty"`
	S3Buckets map[string][]string `json:"s3_buckets,omitempty"` // Only available in S3 Sync Service Type in AWS
}

// AzureCollectionStrategy represents signal collection strategy for Azure services.
// this is Azure specific.
type AzureCollectionStrategy struct {
	Metrics []*AzureMetricsStrategy `json:"azure_metrics,omitempty"`
	Logs    []*AzureLogsStrategy    `json:"azure_logs,omitempty"`
}

// AWSMetricsStrategy represents metrics collection strategy for AWS services.
// this is AWS specific.
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

// AzureMetricsStrategy represents metrics collection strategy for Azure services.
// this is Azure specific.
type AzureMetricsStrategy struct {
	CategoryType string `json:"category_type"`
	Name         string `json:"name"`
}

// AzureLogsStrategy represents logs collection strategy for Azure services.
// this is Azure specific. Even though this is similar to AzureMetricsStrategy, keeping it separate for future flexibility and clarity.
type AzureLogsStrategy struct {
	CategoryType string `json:"category_type"`
	Name         string `json:"name"`
}

// Dashboard represents a dashboard definition for cloud integration.
type Dashboard struct {
	Id          string                                `json:"id"`
	Url         string                                `json:"url"`
	Title       string                                `json:"title"`
	Description string                                `json:"description"`
	Image       string                                `json:"image"`
	Definition  *dashboardtypes.StorableDashboardData `json:"definition,omitempty"`
}

// UTILS

// GetCloudIntegrationDashboardID returns the dashboard id for a cloud integration, given the cloud provider, service id, and dashboard id.
// This is used to generate unique dashboard ids for cloud integration, and also to parse the dashboard id to get the cloud provider and service id when needed.
func GetCloudIntegrationDashboardID(cloudProvider valuer.String, svcId, dashboardId string) string {
	return fmt.Sprintf("cloud-integration--%s--%s--%s", cloudProvider, svcId, dashboardId)
}

// GetDashboardsFromAssets returns the list of dashboards for the cloud provider service from definition
func GetDashboardsFromAssets(
	svcId string,
	orgID valuer.UUID,
	cloudProvider CloudProviderType,
	createdAt *time.Time,
	assets Assets,
) []*dashboardtypes.Dashboard {
	dashboards := make([]*dashboardtypes.Dashboard, 0)

	for _, d := range assets.Dashboards {
		author := fmt.Sprintf("%s-integration", cloudProvider)
		dashboards = append(dashboards, &dashboardtypes.Dashboard{
			ID:     GetCloudIntegrationDashboardID(cloudProvider, svcId, d.Id),
			Locked: true,
			OrgID:  orgID,
			Data:   *d.Definition,
			TimeAuditable: types.TimeAuditable{
				CreatedAt: *createdAt,
				UpdatedAt: *createdAt,
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: author,
				UpdatedBy: author,
			},
		})
	}

	return dashboards
}
