package cloudintegrations

import (
	"fmt"

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

type CompiledCollectionStrategy = services.CollectionStrategy

func NewCompiledCollectionStrategy(provider string) (*CompiledCollectionStrategy, error) {
	if provider == "aws" {
		return &CompiledCollectionStrategy{
			Provider:   "aws",
			AWSMetrics: &services.AWSMetricsStrategy{},
			AWSLogs:    &services.AWSLogsStrategy{},
		}, nil
	}

	return nil, fmt.Errorf("unsupported cloud provider: %s", provider)
}

// Helper for accumulating strategies for enabled services.
func AddServiceStrategy(serviceType string, cs *CompiledCollectionStrategy,
	definitionStrat *services.CollectionStrategy, config *types.CloudServiceConfig) error {
	if definitionStrat.Provider != cs.Provider {
		return fmt.Errorf(
			"can't add %s service strategy to compiled strategy for %s",
			definitionStrat.Provider, cs.Provider,
		)
	}

	if cs.Provider == "aws" {
		if config.Logs != nil && config.Logs.Enabled {
			// services that includes a logs subscription
			if definitionStrat.AWSLogs != nil {
				cs.AWSLogs.Subscriptions = append(
					cs.AWSLogs.Subscriptions,
					definitionStrat.AWSLogs.Subscriptions...,
				)
			} else if serviceType == services.S3Sync && len(config.Logs.S3Buckets) > 0 {
				// S3 bucket sync; No cloudwatch logs are appended for this service type;
				// Though definition is populated with a custom cloudwatch group that helps in calculating logs connection status
				cs.S3Buckets = config.Logs.S3Buckets
			}
		}
		if config.Metrics != nil && config.Metrics.Enabled && definitionStrat.AWSMetrics != nil {
			cs.AWSMetrics.StreamFilters = append(
				cs.AWSMetrics.StreamFilters,
				definitionStrat.AWSMetrics.StreamFilters...,
			)
		}

		return nil
	}

	return fmt.Errorf("unsupported cloud provider: %s", cs.Provider)
}
