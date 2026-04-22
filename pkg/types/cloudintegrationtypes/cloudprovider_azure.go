package cloudintegrationtypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AgentArmTemplateS3Path   = valuer.NewString("https://signoz-integrations.s3.us-east-1.amazonaws.com/azure-arm-template-%s.json")
	AgentDeploymentStackName = valuer.NewString("signoz-integration")
)

type AzureAccountConfig struct {
	DeploymentRegion string   `json:"deploymentRegion" required:"true"`
	ResourceGroups   []string `json:"resourceGroups" required:"true" nullable:"false"`
}

type UpdatableAzureAccountConfig struct {
	ResourceGroups []string `json:"resourceGroups" required:"true" nullable:"false"`
}

type AzurePostableAccountConfig = AzureAccountConfig

type AzureConnectionArtifact struct {
	CLICommand        string `json:"cliCommand" required:"true"`
	CloudShellCommand string `json:"cloudShellCommand" required:"true"`
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
	ResourceType string                          `json:"resourceType" required:"true"`
	Metrics      *AzureMetricsCollectionStrategy `json:"metrics,omitempty" required:"false" nullable:"false"`
	Logs         *AzureLogsCollectionStrategy    `json:"logs,omitempty" required:"false" nullable:"false"`
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

func NewAzureConnectionArtifact(cliCommand, cloudShellCommand string) *AzureConnectionArtifact {
	return &AzureConnectionArtifact{
		CLICommand:        cliCommand,
		CloudShellCommand: cloudShellCommand,
	}
}

func NewAzureConnectionCLICommand(
	accountID valuer.UUID,
	agentVersion string,
	creds *Credentials,
	cfg *AzurePostableAccountConfig,
) string {
	templateURL := fmt.Sprintf(AgentArmTemplateS3Path.StringValue(), agentVersion)
	lines := []string{
		"az stack sub create",
		fmt.Sprintf("  --name %s", AgentDeploymentStackName.StringValue()),
		fmt.Sprintf("  --location %s", cfg.DeploymentRegion),
		fmt.Sprintf("  --template-uri %s", templateURL),
		"  --parameters",
		fmt.Sprintf("    location='%s'", cfg.DeploymentRegion),
		fmt.Sprintf("    signozApiKey='%s'", creds.SigNozAPIKey),
		fmt.Sprintf("    signozApiUrl='%s'", creds.SigNozAPIURL),
		fmt.Sprintf("    signozIngestionUrl='%s'", creds.IngestionURL),
		fmt.Sprintf("    signozIngestionKey='%s'", creds.IngestionKey),
		fmt.Sprintf("    signozCloudIntegrationAccountId='%s'", accountID.StringValue()),
		"  --action-on-unmanage deleteAll",
		"  --deny-settings-mode none",
	}
	return strings.Join(lines, " \\\n")
}

func NewAzureConnectionPowerShellCommand(
	accountID valuer.UUID,
	agentVersion string,
	creds *Credentials,
	cfg *AzurePostableAccountConfig,
) string {
	params := []struct{ k, v string }{
		{"location", cfg.DeploymentRegion},
		{"signozApiKey", creds.SigNozAPIKey},
		{"signozApiUrl", creds.SigNozAPIURL},
		{"signozIngestionUrl", creds.IngestionURL},
		{"signozIngestionKey", creds.IngestionKey},
		{"signozCloudIntegrationAccountId", accountID.StringValue()},
		{"rgName", "signoz-integration-rg"},
		{"containerEnvName", "signoz-integration-agent-env"},
		{"deploymentEnv", "production"},
	}

	const keyWidth = 36
	var paramLines []string
	for _, p := range params {
		paramLines = append(paramLines, fmt.Sprintf("    %-*s= \"%s\"", keyWidth, p.k, p.v))
	}

	templateURL := fmt.Sprintf(AgentArmTemplateS3Path.StringValue(), agentVersion)
	return strings.Join([]string{
		"New-AzSubscriptionDeploymentStack `",
		fmt.Sprintf("  -Name \"%s\" `", AgentDeploymentStackName.StringValue()),
		fmt.Sprintf("  -Location \"%s\" `", cfg.DeploymentRegion),
		fmt.Sprintf("  -TemplateUri \"%s\" `", templateURL),
		"  -TemplateParameterObject @{",
		strings.Join(paramLines, "\n"),
		"  } `",
		"  -ActionOnUnmanage \"deleteAll\" `",
		"  -DenySettingsMode \"none\"",
	}, "\n")
}
