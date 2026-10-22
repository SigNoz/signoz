package cloudintegrationtypes

type GCPAccountConfig struct {
	// Project ID where central pub/sub for logs exist
	DeploymentProjectID string `json:"deploymentProjectId" required:"true"`
	// Project ID where otel collector will be deployed
	DeploymentRegion string `json:"deploymentRegion" required:"true"`
	// List of project IDs to monitor
	ProjectIDs []string `json:"projectIds" required:"true" nullable:"false"`
}

type GCPPostableAccountConfig = GCPAccountConfig

type UpdatableGCPAccountConfig struct {
	// Project ID where central pub/sub for logs exist
	DeploymentProjectID string `json:"deploymentProjectId" required:"true"`
	// Compute service region where otel collector will be deployed
	DeploymentRegion string `json:"deploymentRegion" required:"true"`
	// List of project IDs to monitor
	ProjectIDs []string `json:"projectIds" required:"true"`
}

type GCPConnectionArtifact struct{}

type GCPIntegrationConfig struct{}

type GCPTelemetryCollectionStrategy struct {
	Metrics *GCPMetricsCollectionStrategy `json:"metrics" required:"false" nullable:"false"`
	Logs    *GCPLogsCollectionStrategy    `json:"logs" required:"false" nullable:"false"`
}

type GCPMetricsCollectionStrategy struct {
	MetricNames []string `json:"metricNames" required:"true" nullable:"false"`
}

type GCPLogsCollectionStrategy struct {
	// Cloud Logging filter for the log sink, https://cloud.google.com/logging/docs/view/logging-query-language
	SinkFilter string `json:"sinkFilter" required:"true"`
}

type GCPServiceConfig struct {
	Logs    *GCPServiceLogsConfig    `json:"logs,omitempty" required:"false"`
	Metrics *GCPServiceMetricsConfig `json:"metrics,omitempty" required:"false"`
}

type GCPServiceLogsConfig struct {
	Enabled bool `json:"enabled" required:"true"`
}

type GCPServiceMetricsConfig struct {
	Enabled bool `json:"enabled" required:"true"`
}
