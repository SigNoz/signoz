package integrationstypes

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

type DefinitionMetadata struct {
	Id    string `json:"id"`
	Title string `json:"title"`
	Icon  string `json:"icon"`
}

type Definition interface {
	GetId() string
	Validate() error
	PopulateDashboardURLs(svcId string)
}

var _ Definition = &AWSServiceDefinition{}
var _ Definition = &AzureServiceDefinition{}

type AWSServiceDefinition struct {
	DefinitionMetadata
	Overview             string                 `json:"overview"` // markdown
	Assets               Assets                 `json:"assets"`
	SupportedSignals     SupportedSignals       `json:"supported_signals"`
	DataCollected        DataCollected          `json:"data_collected"`
	Strategy             *AWSCollectionStrategy `json:"telemetry_collection_strategy"`
	IngestionStatusCheck *IngestionStatusCheck  `json:"ingestion_status_check"`
}

type IngestionStatusCheck struct {
	Metrics []*IngestionStatusCheckCategory `json:"metrics"`
	Logs    []*IngestionStatusCheckCategory `json:"logs"`
}

type IngestionStatusCheckCategory struct {
	Category    string                           `json:"category"`
	DisplayName string                           `json:"display_name"`
	Checks      []*IngestionStatusCheckAttribute `json:"checks"`
}

type IngestionStatusCheckAttribute struct {
	Key        string                                 `json:"key"` // search key (metric name or log message)
	Attributes []*IngestionStatusCheckAttributeFilter `json:"attributes"`
}

type IngestionStatusCheckAttributeFilter struct {
	Name     string `json:"name"`
	Operator string `json:"operator"`
	Value    string `json:"value"`
}

func (def *AWSServiceDefinition) GetId() string {
	return def.Id
}

func (def *AWSServiceDefinition) Validate() error {
	seenDashboardIds := map[string]interface{}{}

	if def.Strategy == nil {
		return errors.NewInternalf(errors.CodeInternal, "telemetry_collection_strategy is required")
	}

	for _, dd := range def.Assets.Dashboards {
		if _, seen := seenDashboardIds[dd.Id]; seen {
			return errors.NewInternalf(errors.CodeInternal, "multiple dashboards found with id %s for AWS Integration", dd.Id)
		}
		seenDashboardIds[dd.Id] = nil
	}

	return nil
}

func (def *AWSServiceDefinition) PopulateDashboardURLs(serviceId string) {
	for i := range def.Assets.Dashboards {
		dashboardId := def.Assets.Dashboards[i].Id
		url := "/dashboard/" + GetCloudIntegrationDashboardID(CloudProviderAWS, serviceId, dashboardId)
		def.Assets.Dashboards[i].Url = url
	}
}

type AzureServiceDefinition struct {
	DefinitionMetadata

	Overview string `json:"overview"` // markdown

	Assets Assets `json:"assets"`

	SupportedSignals SupportedSignals `json:"supported_signals"`

	DataCollected DataCollected `json:"data_collected"`

	Strategy *AzureCollectionStrategy `json:"telemetry_collection_strategy"`
}

func (def *AzureServiceDefinition) PopulateDashboardURLs(svcId string) {
	for i := range def.Assets.Dashboards {
		dashboardId := def.Assets.Dashboards[i].Id
		url := "/dashboard/" + GetCloudIntegrationDashboardID(CloudProviderAzure, svcId, dashboardId)
		def.Assets.Dashboards[i].Url = url
	}
}

func (def *AzureServiceDefinition) GetId() string {
	return def.Id
}

func (def *AzureServiceDefinition) Validate() error {
	seenDashboardIds := map[string]interface{}{}

	if def.Strategy == nil {
		return errors.NewInternalf(errors.CodeInternal, "telemetry_collection_strategy is required")
	}

	for _, dd := range def.Assets.Dashboards {
		if _, seen := seenDashboardIds[dd.Id]; seen {
			return errors.NewInternalf(errors.CodeInternal, "multiple dashboards found with id %s for Azure Integration", dd.Id)
		}
		seenDashboardIds[dd.Id] = nil
	}

	return nil
}

type Assets struct {
	Dashboards []Dashboard `json:"dashboards"`
}

type SupportedSignals struct {
	Logs    bool `json:"logs"`
	Metrics bool `json:"metrics"`
}

type DataCollected struct {
	Logs    []CollectedLogAttribute `json:"logs"`
	Metrics []CollectedMetric       `json:"metrics"`
}

type CollectedLogAttribute struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
}

type CollectedMetric struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Unit        string `json:"unit"`
	Description string `json:"description"`
}

type AWSCollectionStrategy struct {
	Provider valuer.String `json:"provider"`

	AWSMetrics *AWSMetricsStrategy `json:"aws_metrics,omitempty"`
	AWSLogs    *AWSLogsStrategy    `json:"aws_logs,omitempty"`
	S3Buckets  map[string][]string `json:"s3_buckets,omitempty"` // Only available in S3 Sync Service Type
}

type AzureCollectionStrategy struct {
	AzureMetrics []*AzureMetricsStrategy `json:"azure_metrics"`
	AzureLogs    []*AzureLogsStrategy    `json:"azure_logs"`
}

type AzureResourceGroup struct {
	Name   string `json:"name"`
	Region string `json:"region"`
}

type AWSMetricsStrategy struct {
	// to be used as https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-metricstream.html#cfn-cloudwatch-metricstream-includefilters
	StreamFilters []struct {
		// json tags here are in the shape expected by AWS API as detailed at
		// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudwatch-metricstream-metricstreamfilter.html
		Namespace   string   `json:"Namespace"`
		MetricNames []string `json:"MetricNames,omitempty"`
	} `json:"cloudwatch_metric_stream_filters"`
}

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

type AzureMetricsStrategy struct {
	CategoryType string `json:"category_type"`
	Name         string `json:"name"`
}

type AzureLogsStrategy struct {
	CategoryType string `json:"category_type"`
	Name         string `json:"name"`
}

type Dashboard struct {
	Id          string                                `json:"id"`
	Url         string                                `json:"url"`
	Title       string                                `json:"title"`
	Description string                                `json:"description"`
	Image       string                                `json:"image"`
	Definition  *dashboardtypes.StorableDashboardData `json:"definition,omitempty"`
}

func GetCloudIntegrationDashboardID(cloudProvider valuer.String, svcId, dashboardId string) string {
	return fmt.Sprintf("cloud-integration--%s--%s--%s", cloudProvider, svcId, dashboardId)
}

func GetDashboardsFromAssets(svcId string, cloudProvider CloudProviderType, createdAt *time.Time, assets Assets) []*dashboardtypes.Dashboard {
	dashboards := make([]*dashboardtypes.Dashboard, 0)

	for _, d := range assets.Dashboards {
		author := fmt.Sprintf("%s-integration", cloudProvider)
		dashboards = append(dashboards, &dashboardtypes.Dashboard{
			ID:     GetCloudIntegrationDashboardID(cloudProvider, svcId, d.Id),
			Locked: true,
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
