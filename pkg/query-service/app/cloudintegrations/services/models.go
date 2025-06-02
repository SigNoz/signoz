package services

import (
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
)

type Metadata struct {
	Id    string `json:"id"`
	Title string `json:"title"`
	Icon  string `json:"icon"`
}

type Definition struct {
	Metadata

	Overview string `json:"overview"` // markdown

	Assets Assets `json:"assets"`

	SupportedSignals SupportedSignals `json:"supported_signals"`

	DataCollected DataCollected `json:"data_collected"`

	Strategy *CollectionStrategy `json:"telemetry_collection_strategy"`
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

type CollectionStrategy struct {
	Provider string `json:"provider"`

	AWSMetrics *AWSMetricsStrategy `json:"aws_metrics,omitempty"`
	AWSLogs    *AWSLogsStrategy    `json:"aws_logs,omitempty"`
	S3Buckets  map[string][]string `json:"s3_buckets,omitempty"` // Only available in S3 Sync Service Type
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

type Dashboard struct {
	Id          string                                `json:"id"`
	Url         string                                `json:"url"`
	Title       string                                `json:"title"`
	Description string                                `json:"description"`
	Image       string                                `json:"image"`
	Definition  *dashboardtypes.StorableDashboardData `json:"definition,omitempty"`
}
