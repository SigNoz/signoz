package cloudintegrationtypes

import (
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AgentArmTemplateStorePath = valuer.NewString("https://signoz-integrations.s3.us-east-1.amazonaws.com/azure-arm-template-%s.json")
	AgentDeploymentStackName  = valuer.NewString("signoz-integration")

	// Default values for fixed ARM template parameters.
	armDefaultRgName           = valuer.NewString("signoz-integration-rg")
	armDefaultContainerEnvName = valuer.NewString("signoz-integration-agent-env")
	armDefaultDeploymentEnv    = valuer.NewString("production")

	// ARM template parameter key names used in both CLI and PowerShell deployment commands.
	armParamLocation           = valuer.NewString("location")
	armParamSignozAPIKey       = valuer.NewString("signozApiKey")
	armParamSignozAPIUrl       = valuer.NewString("signozApiUrl")
	armParamSignozIngestionURL = valuer.NewString("signozIngestionUrl")
	armParamSignozIngestionKey = valuer.NewString("signozIngestionKey")
	armParamAccountID          = valuer.NewString("signozIntegrationAccountId")
	armParamAgentVersion       = valuer.NewString("signozIntegrationAgentVersion")
	armParamRgName             = valuer.NewString("rgName")
	armParamContainerEnvName   = valuer.NewString("containerEnvName")
	armParamDeploymentEnv      = valuer.NewString("deploymentEnv")
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

// azureDeployParams holds the ARM template parameters shared by both command builders.
type azureDeployParams struct {
	templateURL        string
	location           string
	signozAPIKey       string
	signozAPIUrl       string
	signozIngestionURL string
	signozIngestionKey string
	accountID          string
	agentVersion       string
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

func NewAzureConnectionArtifact(
	accountID valuer.UUID,
	agentVersion string,
	creds *Credentials,
	cfg *AzurePostableAccountConfig,
) *AzureConnectionArtifact {
	p := azureDeployParams{
		templateURL:        fmt.Sprintf(AgentArmTemplateStorePath.StringValue(), agentVersion),
		location:           cfg.DeploymentRegion,
		signozAPIKey:       creds.SigNozAPIKey,
		signozAPIUrl:       creds.SigNozAPIURL,
		signozIngestionURL: creds.IngestionURL,
		signozIngestionKey: creds.IngestionKey,
		accountID:          accountID.StringValue(),
		agentVersion:       agentVersion,
	}
	return &AzureConnectionArtifact{
		CLICommand:             newAzureConnectionCLICommand(p),
		CloudPowerShellCommand: newAzureConnectionPowerShellCommand(p),
	}
}

// by the nature of cli commands its hard to generate the command in idiomatic way or elegantly,
// but tried to make it more readable by splitting into multiple lines and using helper functions to format flags and parameters.
func newAzureConnectionCLICommand(p azureDeployParams) string {
	lines := []string{
		"az stack sub create",
		cliFlag("name", AgentDeploymentStackName.StringValue()),
		cliFlag("location", p.location),
		cliFlag("template-uri", p.templateURL),
		"  --parameters",
		cliParam(armParamLocation.StringValue(), p.location),
		cliParam(armParamSignozAPIKey.StringValue(), p.signozAPIKey),
		cliParam(armParamSignozAPIUrl.StringValue(), p.signozAPIUrl),
		cliParam(armParamSignozIngestionURL.StringValue(), p.signozIngestionURL),
		cliParam(armParamSignozIngestionKey.StringValue(), p.signozIngestionKey),
		cliParam(armParamAccountID.StringValue(), p.accountID),
		cliParam(armParamAgentVersion.StringValue(), p.agentVersion),
		cliFlag("action-on-unmanage", "deleteAll"),
		cliFlag("deny-settings-mode", "denyDelete"),
	}
	return strings.Join(lines, " \\\n")
}

func newAzureConnectionPowerShellCommand(p azureDeployParams) string {
	params := []string{
		psParam(armParamLocation.StringValue(), p.location),
		psParam(armParamSignozAPIKey.StringValue(), p.signozAPIKey),
		psParam(armParamSignozAPIUrl.StringValue(), p.signozAPIUrl),
		psParam(armParamSignozIngestionURL.StringValue(), p.signozIngestionURL),
		psParam(armParamSignozIngestionKey.StringValue(), p.signozIngestionKey),
		psParam(armParamAccountID.StringValue(), p.accountID),
		psParam(armParamAgentVersion.StringValue(), p.agentVersion),
		psParam(armParamRgName.StringValue(), armDefaultRgName.StringValue()),
		psParam(armParamContainerEnvName.StringValue(), armDefaultContainerEnvName.StringValue()),
		psParam(armParamDeploymentEnv.StringValue(), armDefaultDeploymentEnv.StringValue()),
	}
	lines := []string{
		"New-AzSubscriptionDeploymentStack `",
		psArg("Name", AgentDeploymentStackName.StringValue()),
		psArg("Location", p.location),
		psArg("TemplateUri", p.templateURL),
		"  -TemplateParameterObject @{",
		strings.Join(params, "\n"),
		"  } `",
		psArg("ActionOnUnmanage", "deleteAll"),
		psArg("DenySettingsMode", "denyDelete"),
	}
	return strings.TrimSuffix(strings.Join(lines, "\n"), " `")
}

// cliFlag formats a top-level az CLI flag: --flag value.
func cliFlag(flag, value string) string {
	return fmt.Sprintf("  --%s %s", flag, value)
}

// cliParam formats an ARM template parameter: key='value'.
func cliParam(key, value string) string {
	return fmt.Sprintf("    %s='%s'", key, value)
}

// psArg formats a PowerShell cmdlet argument with a line-continuation backtick: -Flag "value" `.
func psArg(flag, value string) string {
	return fmt.Sprintf("  -%s \"%s\" `", flag, value)
}


// psParam formats a single PowerShell hashtable entry with consistent key alignment.
func psParam(key, value string) string {
	// 36 accommodates the longest key ("signozIntegrationAgentVersion", 29 chars) plus padding.
	// so that final output looks like: "	signozIntegrationAgentVersion = "value"" with some padding
	const keyWidth = 36
	return fmt.Sprintf("    %-*s= \"%s\"", keyWidth, key, value)
}
