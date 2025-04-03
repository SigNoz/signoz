package cloudintegrations

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"

	"github.com/SigNoz/signoz/pkg/types"
)

type CloudServiceSummary struct {
	Id    string `json:"id"`
	Title string `json:"title"`
	Icon  string `json:"icon"`

	// Present only if the service has been configured in the
	// context of a cloud provider account.
	Config *CloudServiceConfig `json:"config,omitempty"`
}

type CloudServiceDetails struct {
	CloudServiceSummary

	Overview string `json:"overview"` // markdown

	Assets CloudServiceAssets `json:"assets"`

	SupportedSignals SupportedSignals `json:"supported_signals"`

	DataCollected DataCollectedForService `json:"data_collected"`

	ConnectionStatus *CloudServiceConnectionStatus `json:"status,omitempty"`

	TelemetryCollectionStrategy *CloudTelemetryCollectionStrategy `json:"telemetry_collection_strategy"`
}

type CloudServiceConfig struct {
	Logs    *CloudServiceLogsConfig    `json:"logs,omitempty"`
	Metrics *CloudServiceMetricsConfig `json:"metrics,omitempty"`
}

// For serializing from db
func (c *CloudServiceConfig) Scan(src any) error {
	data, ok := src.([]byte)
	if !ok {
		return fmt.Errorf("tried to scan from %T instead of bytes", src)
	}

	return json.Unmarshal(data, &c)
}

// For serializing to db
func (c *CloudServiceConfig) Value() (driver.Value, error) {
	if c == nil {
		return nil, nil
	}

	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize cloud service config to JSON: %w", err,
		)
	}
	return serialized, nil
}

type CloudServiceLogsConfig struct {
	Enabled bool `json:"enabled"`
}

type CloudServiceMetricsConfig struct {
	Enabled bool `json:"enabled"`
}

type CloudServiceAssets struct {
	Dashboards []CloudServiceDashboard `json:"dashboards"`
}

type CloudServiceDashboard struct {
	Id          string               `json:"id"`
	Url         string               `json:"url"`
	Title       string               `json:"title"`
	Description string               `json:"description"`
	Image       string               `json:"image"`
	Definition  *types.DashboardData `json:"definition,omitempty"`
}

type SupportedSignals struct {
	Logs    bool `json:"logs"`
	Metrics bool `json:"metrics"`
}

type DataCollectedForService struct {
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

type CloudServiceConnectionStatus struct {
	Logs    *SignalConnectionStatus `json:"logs"`
	Metrics *SignalConnectionStatus `json:"metrics"`
}

type SignalConnectionStatus struct {
	LastReceivedTsMillis int64  `json:"last_received_ts_ms"` // epoch milliseconds
	LastReceivedFrom     string `json:"last_received_from"`  // resource identifier
}

type CloudTelemetryCollectionStrategy struct {
	Provider string `json:"provider"`

	AWSMetrics *AWSMetricsCollectionStrategy `json:"aws_metrics,omitempty"`
	AWSLogs    *AWSLogsCollectionStrategy    `json:"aws_logs,omitempty"`
}

func NewCloudTelemetryCollectionStrategy(provider string) (*CloudTelemetryCollectionStrategy, error) {
	if provider == "aws" {
		return &CloudTelemetryCollectionStrategy{
			Provider: "aws",
			AWSMetrics: &AWSMetricsCollectionStrategy{
				CloudwatchMetricsStreamFilters: []CloudwatchMetricStreamFilter{},
			},
			AWSLogs: &AWSLogsCollectionStrategy{
				CloudwatchLogsSubscriptions: []CloudwatchLogsSubscriptionConfig{},
			},
		}, nil
	}

	return nil, fmt.Errorf("unsupported cloud provider: %s", provider)
}

// Helper for accumulating strategies for enabled services.
func (cs *CloudTelemetryCollectionStrategy) AddServiceStrategy(
	svcStrategy *CloudTelemetryCollectionStrategy,
	logsEnabled bool,
	metricsEnabled bool,
) error {
	if svcStrategy.Provider != cs.Provider {
		return fmt.Errorf(
			"can't add %s service strategy to strategy for %s",
			svcStrategy.Provider, cs.Provider,
		)
	}

	if cs.Provider == "aws" {
		if logsEnabled {
			cs.AWSLogs.AddServiceStrategy(svcStrategy.AWSLogs)
		}
		if metricsEnabled {
			cs.AWSMetrics.AddServiceStrategy(svcStrategy.AWSMetrics)
		}
		return nil
	}

	return fmt.Errorf("unsupported cloud provider: %s", cs.Provider)

}

type AWSMetricsCollectionStrategy struct {
	// to be used as https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-metricstream.html#cfn-cloudwatch-metricstream-includefilters
	CloudwatchMetricsStreamFilters []CloudwatchMetricStreamFilter `json:"cloudwatch_metric_stream_filters"`
}

type CloudwatchMetricStreamFilter struct {
	// json tags here are in the shape expected by AWS API as detailed at
	// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudwatch-metricstream-metricstreamfilter.html
	Namespace   string   `json:"Namespace"`
	MetricNames []string `json:"MetricNames,omitempty"`
}

func (amc *AWSMetricsCollectionStrategy) AddServiceStrategy(
	svcStrategy *AWSMetricsCollectionStrategy,
) error {
	if svcStrategy == nil {
		return nil
	}

	amc.CloudwatchMetricsStreamFilters = append(
		amc.CloudwatchMetricsStreamFilters,
		svcStrategy.CloudwatchMetricsStreamFilters...,
	)
	return nil
}

type AWSLogsCollectionStrategy struct {
	CloudwatchLogsSubscriptions []CloudwatchLogsSubscriptionConfig `json:"cloudwatch_logs_subscriptions"`
}

type CloudwatchLogsSubscriptionConfig struct {
	// subscribe to all logs groups with specified prefix.
	// eg: `/aws/rds/`
	LogGroupNamePrefix string `json:"log_group_name_prefix"`

	// https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
	// "" implies no filtering is required.
	FilterPattern string `json:"filter_pattern"`
}

func (alc *AWSLogsCollectionStrategy) AddServiceStrategy(
	svcStrategy *AWSLogsCollectionStrategy,
) error {
	if svcStrategy == nil {
		return nil
	}

	alc.CloudwatchLogsSubscriptions = append(
		alc.CloudwatchLogsSubscriptions,
		svcStrategy.CloudwatchLogsSubscriptions...,
	)
	return nil
}
