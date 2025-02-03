package cloudintegrations

import (
	"bytes"
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

	TelemetryCollectionStrategy *CloudTelemetryCollectionStrategy `json:"telemetry_collection_strategy"`
}

func (csd *CloudServiceDetails) MarshalJSON() ([]byte, error) {
	// Prevent marshalling of TelemetryCollectionStrategy since it contains interface fields

	// use temp type, since json.Marshal can't be called on CloudServiceDetails here
	type svcDetails CloudServiceDetails
	sd := svcDetails(*csd)
	sd.TelemetryCollectionStrategy = nil
	return json.Marshal(sd)
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

// The exact shape of signal collection strategy will vary by cloud provider.
type CloudSignalCollectionStrategy interface {
	// Should be able to accumulate signal collection strategy incrementally when needed
	UpdateWithServiceStrategy(CloudSignalCollectionStrategy) error
}

type CloudTelemetryCollectionStrategy struct {
	MetricsCollectionStrategy CloudSignalCollectionStrategy `json:"metrics"`

	LogsCollectionStrategy CloudSignalCollectionStrategy `json:"logs"`
}

func NewCloudTelemetryCollectionStrategy(cloudProvider string) (
	*CloudTelemetryCollectionStrategy, error,
) {
	return ParseCloudTelemetryCollectionStrategyFromMap(
		cloudProvider, map[string]any{},
	)
}

// Parsing directly from JSON doesn't work since metrics and logs
// collection strategy fields are interfaces in CloudTelemetryCollectionStrategy
func ParseCloudTelemetryCollectionStrategyFromMap(
	cloudProvider string, data map[string]any,
) (*CloudTelemetryCollectionStrategy, error) {

	if cloudProvider == "aws" {
		result := CloudTelemetryCollectionStrategy{
			MetricsCollectionStrategy: &AWSMetricsCollectionStrategy{
				CloudwatchMetricsStreamFilters: []CloudwatchMetricStreamFilter{},
			},
			LogsCollectionStrategy: &AWSLogsCollectionStrategy{
				CloudwatchLogsSubscriptions: []CloudwatchLogsSubscriptionConfig{},
			},
		}

		if metricsStrategyMap, ok := data["metrics"].(map[string]any); ok {
			metricsStrategy, err := ParseStructWithJsonTagsFromMap[AWSMetricsCollectionStrategy](
				metricsStrategyMap,
			)
			if err != nil {
				return nil, fmt.Errorf(
					"couldn't decode metrics collection strategy: %w", err,
				)
			}
			result.MetricsCollectionStrategy = metricsStrategy
		}

		if logsStrategyMap, ok := data["logs"].(map[string]any); ok {
			logsStrategy, err := ParseStructWithJsonTagsFromMap[AWSLogsCollectionStrategy](
				logsStrategyMap,
			)
			if err != nil {
				return nil, fmt.Errorf("couldn't decode logs collection strategy: %w", err)
			}
			result.LogsCollectionStrategy = logsStrategy
		}

		return &result, nil
	}

	return nil, fmt.Errorf("unsupported cloud provider: %s", cloudProvider)
}

func ParseStructWithJsonTagsFromMap[StructType any](data map[string]any) (
	*StructType, error,
) {
	mapJson, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("couldn't marshal map to json: %w", err)
	}

	var res StructType
	decoder := json.NewDecoder(bytes.NewReader(mapJson))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&res)
	if err != nil {
		return nil, fmt.Errorf("couldn't unmarshal json back to struct: %w", err)
	}
	return &res, nil
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

func (amc *AWSMetricsCollectionStrategy) UpdateWithServiceStrategy(
	svcStrategy CloudSignalCollectionStrategy,
) error {
	if svcStrategy == nil {
		return nil
	}

	metricsStrategy, ok := svcStrategy.(*AWSMetricsCollectionStrategy)
	if !ok {
		return fmt.Errorf(
			"AWSMetricsCollectionStrategy can't be updated with %T", svcStrategy,
		)
	}

	amc.CloudwatchMetricsStreamFilters = append(
		amc.CloudwatchMetricsStreamFilters,
		metricsStrategy.CloudwatchMetricsStreamFilters...,
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

func (alc *AWSLogsCollectionStrategy) UpdateWithServiceStrategy(
	svcStrategy CloudSignalCollectionStrategy,
) error {
	if svcStrategy == nil {
		return nil
	}

	logsStrategy, ok := svcStrategy.(*AWSLogsCollectionStrategy)
	if !ok {
		return fmt.Errorf(
			"AWSLogsCollectionStrategy can't be updated with %T", svcStrategy,
		)
	}

	alc.CloudwatchLogsSubscriptions = append(
		alc.CloudwatchLogsSubscriptions,
		logsStrategy.CloudwatchLogsSubscriptions...,
	)
	return nil
}
