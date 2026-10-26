package cloudintegrationtypes

import (
	"bytes"
	"text/template"

	"github.com/SigNoz/signoz/pkg/valuer"
)

var azureCLITemplate = template.Must(template.New("azureCLI").Funcs(foundryTemplateFuncs).Parse(azureCLITemplateStr()))

type AzureAccountConfig struct {
	DeploymentRegion string   `json:"deploymentRegion" required:"true"`
	ResourceGroups   []string `json:"resourceGroups" required:"true" nullable:"false"`
}

type UpdatableAzureAccountConfig struct {
	ResourceGroups []string `json:"resourceGroups" required:"true" nullable:"false"`
}

type AzurePostableAccountConfig = AzureAccountConfig

type AzureConnectionArtifact struct {
	CLICommand string `json:"cliCommand" required:"true"`
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

func NewAzureConnectionArtifact(integrationAccountID valuer.UUID, agentVersion string, creds *Credentials, cfg *AzurePostableAccountConfig) (*AzureConnectionArtifact, error) {
	data := foundryTemplateData{
		FoundryScriptURL:     foundryScriptURL,
		Region:               cfg.DeploymentRegion,
		IntegrationAccountID: integrationAccountID.StringValue(),
		AgentVersion:         agentVersion,
		Credentials:          creds,
	}

	var command bytes.Buffer
	if err := azureCLITemplate.Execute(&command, data); err != nil {
		return nil, err
	}

	return &AzureConnectionArtifact{
		CLICommand: command.String(),
	}, nil
}

func azureCLITemplateStr() string {
	return `curl -fsSL {{.FoundryScriptURL | shellQuote}} | bash -s -- cloudintegration azure bicep \
  --region {{.Region | shellQuote}} \
  --integration-account-id {{.IntegrationAccountID | shellQuote}} \
  --signoz-api-url {{.Credentials.SigNozAPIURL | shellQuote}} \
  --signoz-api-key {{.Credentials.SigNozAPIKey | shellQuote}} \
  --ingestion-url {{.Credentials.IngestionURL | shellQuote}} \
  --ingestion-key {{.Credentials.IngestionKey | shellQuote}} \
  --agent-version {{.AgentVersion | shellQuote}}`
}
