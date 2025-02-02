package cloudintegrations

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
)

// Represents a cloud provider account for cloud integrations
type AccountRecord struct {
	CloudProvider   string         `json:"cloud_provider" db:"cloud_provider"`
	Id              string         `json:"id" db:"id"`
	Config          *AccountConfig `json:"config" db:"config_json"`
	CloudAccountId  *string        `json:"cloud_account_id" db:"cloud_account_id"`
	LastAgentReport *AgentReport   `json:"last_agent_report" db:"last_agent_report_json"`
	CreatedAt       time.Time      `json:"created_at" db:"created_at"`
	RemovedAt       *time.Time     `json:"removed_at" db:"removed_at"`
}

type AccountConfig struct {
	EnabledRegions []string `json:"regions"`
}

func DefaultAccountConfig() AccountConfig {
	return AccountConfig{
		EnabledRegions: []string{},
	}
}

// For serializing from db
func (c *AccountConfig) Scan(src any) error {
	data, ok := src.([]byte)
	if !ok {
		return fmt.Errorf("tried to scan from %T instead of bytes", src)
	}

	return json.Unmarshal(data, &c)
}

// For serializing to db
func (c *AccountConfig) Value() (driver.Value, error) {
	if c == nil {
		return nil, nil
	}

	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize cloud account config to JSON: %w", err,
		)
	}
	return serialized, nil
}

type AgentReport struct {
	TimestampMillis int64          `json:"timestamp_millis"`
	Data            map[string]any `json:"data"`
}

// For serializing from db
func (r *AgentReport) Scan(src any) error {
	data, ok := src.([]byte)
	if !ok {
		return fmt.Errorf("tried to scan from %T instead of bytes", src)
	}

	return json.Unmarshal(data, &r)
}

// For serializing to db
func (r *AgentReport) Value() (driver.Value, error) {
	if r == nil {
		return nil, nil
	}

	serialized, err := json.Marshal(r)
	if err != nil {
		return nil, fmt.Errorf(
			"couldn't serialize agent report to JSON: %w", err,
		)
	}
	return serialized, nil
}

type AccountStatus struct {
	Integration AccountIntegrationStatus `json:"integration"`
}

type AccountIntegrationStatus struct {
	LastHeartbeatTsMillis *int64 `json:"last_heartbeat_ts_ms"`
}

func (a *AccountRecord) status() AccountStatus {
	status := AccountStatus{}
	if a.LastAgentReport != nil {
		lastHeartbeat := a.LastAgentReport.TimestampMillis
		status.Integration.LastHeartbeatTsMillis = &lastHeartbeat
	}
	return status
}

func (a *AccountRecord) account() Account {
	ca := Account{Id: a.Id, Status: a.status()}

	if a.CloudAccountId != nil {
		ca.CloudAccountId = *a.CloudAccountId
	}

	if a.Config != nil {
		ca.Config = *a.Config
	} else {
		ca.Config = DefaultAccountConfig()
	}

	return ca
}

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

	CloudTelemetryCollectionStrategy CloudTelemetryCollectionStrategy `json:"cloud_telemetry_collection_strategy"`
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
	Dashboards []dashboards.Data `json:"dashboards"`
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
	// The exact shape of sub configs will depend on the cloud provider
	MetricsCollectionConfig CloudSignalCollectionConfig `json:"metrics"`

	LogsCollectionConfig CloudSignalCollectionConfig `json:"logs"`
}

func NewCloudTelemetryCollectionConfig(cloudProvider string) (
	*CloudTelemetryCollectionStrategy, error,
) {
	if cloudProvider == "aws" {
		return &CloudTelemetryCollectionStrategy{
			MetricsCollectionConfig: &AWSMetricsCollectionConfig{
				CloudwatchMetricsStreamFilters: []CloudwatchMetricStreamFilter{},
			},
			LogsCollectionConfig: &AWSLogsCollectionConfig{
				CloudwatchLogsSubscriptions: []CloudwatchLogsSubscriptionConfig{},
			},
		}, nil
	}
	return nil, fmt.Errorf("unsupported cloud provider: %w", cloudProvider)
}

type CloudSignalCollectionConfig interface {
	// Should be able to accumulate signal collection config
	UpdateWithServiceConfig(CloudSignalCollectionConfig) error
}

type AWSMetricsCollectionConfig struct {
	// to be used for https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudwatch-metricstream.html#cfn-cloudwatch-metricstream-includefilters
	CloudwatchMetricsStreamFilters []CloudwatchMetricStreamFilter `json:"cloudwatch_metric_stream_filters"`
}

type CloudwatchMetricStreamFilter struct {
	// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudwatch-metricstream-metricstreamfilter.html
	// json tags here are in the shape expected by AWS API linked above
	Namespace   string   `json:"Namespace"`
	MetricNames []string `json:"MetricNames,omitempty"`
}

func (amc *AWSMetricsCollectionConfig) UpdateWithServiceConfig(
	svcConfig CloudSignalCollectionConfig,
) error {
	if svcConfig == nil {
		return nil
	}

	metricsConf, ok := svcConfig.(*AWSMetricsCollectionConfig)
	if !ok {
		return fmt.Errorf(
			"AWSMetricsCollectionConfig can't be updated with %T", svcConfig,
		)
	}

	amc.CloudwatchMetricsStreamFilters = append(
		amc.CloudwatchMetricsStreamFilters, metricsConf.CloudwatchMetricsStreamFilters...,
	)
	return nil
}

type AWSLogsCollectionConfig struct {
	CloudwatchLogsSubscriptions []CloudwatchLogsSubscriptionConfig `json:"cloudwatch_logs_subscriptions"`
}

type CloudwatchLogsSubscriptionConfig struct {
	// must be a unique alphanumeric value across all CW logs subscriptions
	Id string `json:"id"`

	// subscribe to all logs groups with specified prefix.
	// eg: `/aws/rds/`
	LogGroupNamePrefix string `json:"log_group_name_prefix"`

	// https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
	FilterPattern string `json:"filter_pattern,omitempty"`
}

func (alc *AWSLogsCollectionConfig) UpdateWithServiceConfig(
	svcConfig CloudSignalCollectionConfig,
) error {
	if svcConfig == nil {
		return nil
	}

	logsConf, ok := svcConfig.(*AWSLogsCollectionConfig)
	if !ok {
		return fmt.Errorf(
			"AWSLogsCollectionConfig can't be updated with %T", svcConfig,
		)
	}

	alc.CloudwatchLogsSubscriptions = append(
		alc.CloudwatchLogsSubscriptions, logsConf.CloudwatchLogsSubscriptions...,
	)
	return nil
}
