package cloudintegrations

import (
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/services"
	"github.com/SigNoz/signoz/pkg/types"
)

type ServiceSummary struct {
	services.Metadata

	Config *types.CloudServiceConfig `json:"config"`
}

type ServiceDetails struct {
	services.Definition

	Config           *types.CloudServiceConfig `json:"config"`
	ConnectionStatus *ServiceConnectionStatus  `json:"status,omitempty"`
}

type AccountStatus struct {
	Integration AccountIntegrationStatus `json:"integration"`
}

type AccountIntegrationStatus struct {
	LastHeartbeatTsMillis *int64 `json:"last_heartbeat_ts_ms"`
}

type LogsConfig struct {
	Enabled   bool                `json:"enabled"`
	S3Buckets map[string][]string `json:"s3_buckets,omitempty"`
}

type MetricsConfig struct {
	Enabled bool `json:"enabled"`
}

type ServiceConnectionStatus struct {
	Logs    *SignalConnectionStatus `json:"logs"`
	Metrics *SignalConnectionStatus `json:"metrics"`
}

type SignalConnectionStatus struct {
	LastReceivedTsMillis int64  `json:"last_received_ts_ms"` // epoch milliseconds
	LastReceivedFrom     string `json:"last_received_from"`  // resource identifier
}

// AddAWSServiceStrategy is a helper for accumulating strategies for enabled services.
func AddAWSServiceStrategy(serviceType string, cs *services.AWSCollectionStrategy,
	definitionStrat *services.AWSCollectionStrategy, config *types.CloudServiceConfig) {
	if config.Logs != nil && config.Logs.Enabled {
		if serviceType == services.S3Sync {
			// S3 bucket sync; No cloudwatch logs are appended for this service type;
			// Though definition is populated with a custom cloudwatch group that helps in calculating logs connection status
			cs.S3Buckets = config.Logs.S3Buckets
		} else if definitionStrat.AWSLogs != nil { // services that includes a logs subscription
			cs.AWSLogs.Subscriptions = append(
				cs.AWSLogs.Subscriptions,
				definitionStrat.AWSLogs.Subscriptions...,
			)
		}
	}
	if config.Metrics != nil && config.Metrics.Enabled && definitionStrat.AWSMetrics != nil {
		cs.AWSMetrics.StreamFilters = append(
			cs.AWSMetrics.StreamFilters,
			definitionStrat.AWSMetrics.StreamFilters...,
		)
	}
}
