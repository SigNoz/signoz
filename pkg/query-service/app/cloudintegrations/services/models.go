package services

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Metadata struct {
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
	Metadata
	Overview         string                 `json:"overview"` // markdown
	Assets           Assets                 `json:"assets"`
	SupportedSignals SupportedSignals       `json:"supported_signals"`
	DataCollected    DataCollected          `json:"data_collected"`
	Strategy         *AWSCollectionStrategy `json:"telemetry_collection_strategy"`
}

func (def *AWSServiceDefinition) GetId() string {
	return def.Id
}

func (def *AWSServiceDefinition) Validate() error {
	seenDashboardIds := map[string]interface{}{}

	for _, dd := range def.Assets.Dashboards {
		if _, seen := seenDashboardIds[dd.Id]; seen {
			return fmt.Errorf("multiple dashboards found with id %s", dd.Id)
		}
		seenDashboardIds[dd.Id] = nil
	}

	if def.Strategy == nil {
		return fmt.Errorf("telemetry_collection_strategy is required")
	}

	return nil
}

func (def *AWSServiceDefinition) PopulateDashboardURLs(serviceId string) {
	for i := range def.Assets.Dashboards {
		dashboardId := def.Assets.Dashboards[i].Id
		url := "/dashboard/" + GetCloudIntegrationDashboardID(types.CloudProviderAWS, serviceId, dashboardId)
		def.Assets.Dashboards[i].Url = url
	}
}

type AzureServiceDefinition struct {
	Metadata

	Overview string `json:"overview"` // markdown

	Assets Assets `json:"assets"`

	SupportedSignals SupportedSignals `json:"supported_signals"`

	DataCollected DataCollected `json:"data_collected"`

	Strategy *AzureCollectionStrategy `json:"telemetry_collection_strategy"`
}

func (def *AzureServiceDefinition) PopulateDashboardURLs(svcId string) {
	for i := range def.Assets.Dashboards {
		dashboardId := def.Assets.Dashboards[i].Id
		url := "/dashboard/" + GetCloudIntegrationDashboardID(types.CloudProviderAzure, svcId, dashboardId)
		def.Assets.Dashboards[i].Url = url
	}
}

func (def *AzureServiceDefinition) GetId() string {
	return def.Id
}

func (def *AzureServiceDefinition) Validate() error {
	seenDashboardIds := map[string]interface{}{}

	for _, dd := range def.Assets.Dashboards {
		if _, seen := seenDashboardIds[dd.Id]; seen {
			return fmt.Errorf("multiple dashboards found with id %s", dd.Id)
		}
		seenDashboardIds[dd.Id] = nil
	}

	if def.Strategy == nil {
		return fmt.Errorf("telemetry_collection_strategy is required")
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
	Provider valuer.String `json:"provider"`

	AzureMetrics []*AzureMetricsStrategy `json:"azure_metrics,omitempty"`
	AzureLogs    []*AzureLogsStrategy    `json:"azure_logs,omitempty"`
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
