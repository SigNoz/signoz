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

type GCPTelemetryCollectionStrategy struct{}

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
