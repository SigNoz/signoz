package cloudintegrationtypes

type AzureAccountConfig struct {
	DeploymentRegion string   `json:"deploymentRegion" required:"true"`
	ResourceGroups   []string `json:"resourceGroups" required:"true" nullable:"false"`
}

type UpdatableAzureAccountConfig struct {
	ResourceGroups []string `json:"resourceGroups" required:"true" nullable:"false"`
}

type AzurePostableAccountConfig = AzureAccountConfig

type AzureConnectionArtifact struct {
	CLICommand             string `json:"cliCommand" required:"true"`
	CloudPowerShellCommand string `json:"cloudPowerShellCommand" required:"true"`
}

type AzureServiceConfig struct {
	Logs    *AzureServiceLogsConfig    `json:"logs" required:"true"`
	Metrics *AzureServiceMetricsConfig `json:"metrics" required:"true"`
}

type AzureServiceLogsConfig struct {
	Enabled bool `json:"enabled"`
}

type AzureServiceMetricsConfig struct {
	Enabled bool `json:"enabled"`
}

type AzureTelemetryCollectionStrategy struct {
	//https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-providers-and-types
	ResourceProvider string                          `json:"resourceProvider" required:"true"`
	ResourceType     string                          `json:"resourceType" required:"true"`
	Metrics          *AzureMetricsCollectionStrategy `json:"metrics,omitempty" required:"false" nullable:"false"`
	Logs             *AzureLogsCollectionStrategy    `json:"logs,omitempty" required:"false" nullable:"false"`
}

// AzureMetricsCollectionStrategy no additional config required for metrics, will be added in future as required.
type AzureMetricsCollectionStrategy struct{}

type AzureLogsCollectionStrategy struct {
	// List of categories to enable for diagnostic settings, to start with it will have 'allLogs' and no filtering.
	CategoryGroups []string `json:"categoryGroups" required:"true" nullable:"false"`
}

type AzureIntegrationConfig struct {
	DeploymentRegion            string                              `json:"deploymentRegion" required:"true"`
	ResourceGroups              []string                            `json:"resourceGroups" required:"true" nullable:"false"`
	TelemetryCollectionStrategy []*AzureTelemetryCollectionStrategy `json:"telemetryCollectionStrategy" required:"true" nullable:"false"`
}

func NewAzureIntegrationConfig(
	deploymentRegion string,
	resourceGroups []string,
	strategies []*AzureTelemetryCollectionStrategy,
) *AzureIntegrationConfig {
	return &AzureIntegrationConfig{
		DeploymentRegion:            deploymentRegion,
		ResourceGroups:              resourceGroups,
		TelemetryCollectionStrategy: strategies,
	}
}
