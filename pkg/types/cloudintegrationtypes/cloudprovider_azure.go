package cloudintegrationtypes

import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AgentArmTemplateStorePath = "https://signoz-integrations.s3.us-east-1.amazonaws.com/azure-arm-template-%s.json"
	AgentDeploymentStackName  = "signoz-integration"

	// Default values for fixed ARM template parameters.
	armDefaultRgName           = "signoz-integration-rg"
	armDefaultContainerEnvName = "signoz-integration-agent-env"
	armDefaultDeploymentEnv    = "production"

	// ARM template parameter key names used in both CLI and PowerShell deployment commands.
	armParamLocation           = "location"
	armParamSignozAPIKey       = "signozApiKey"
	armParamSignozAPIUrl       = "signozApiUrl"
	armParamSignozIngestionURL = "signozIngestionUrl"
	armParamSignozIngestionKey = "signozIngestionKey"
	armParamAccountID          = "signozIntegrationAccountId"
	armParamAgentVersion       = "signozIntegrationAgentVersion"
	armParamRgName             = "rgName"
	armParamContainerEnvName   = "containerEnvName"
	armParamDeploymentEnv      = "deploymentEnv"

	// command templates.
	azureCLITemplate        = template.Must(template.New("azureCLI").Parse(azureCLITemplateStr()))
	azurePowerShellTemplate = template.Must(template.New("azurePS").Parse(azurePowerShellTemplateStr()))
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

// azureTemplateData is the data struct passed to both command templates.
// All fields are exported so text/template can access them.
type azureTemplateData struct {
	// Deploy parameter values.
	TemplateURL        string
	Location           string
	SignozAPIKey       string
	SignozAPIUrl       string
	SignozIngestionURL string
	SignozIngestionKey string
	AccountID          string
	AgentVersion       string
	// ARM parameter key names (from package-level vars).
	StackName               string
	ParamLocation           string
	ParamSignozAPIKey       string
	ParamSignozAPIUrl       string
	ParamSignozIngestionURL string
	ParamSignozIngestionKey string
	ParamAccountID          string
	ParamAgentVersion       string
	ParamRgName             string
	ParamContainerEnvName   string
	ParamDeploymentEnv      string
	// Fixed default values.
	DefaultRgName           string
	DefaultContainerEnvName string
	DefaultDeploymentEnv    string
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
) (*AzureConnectionArtifact, error) {
	data := azureTemplateData{
		TemplateURL:             fmt.Sprintf(AgentArmTemplateStorePath, agentVersion),
		Location:                cfg.DeploymentRegion,
		SignozAPIKey:            creds.SigNozAPIKey,
		SignozAPIUrl:            creds.SigNozAPIURL,
		SignozIngestionURL:      creds.IngestionURL,
		SignozIngestionKey:      creds.IngestionKey,
		AccountID:               accountID.StringValue(),
		AgentVersion:            agentVersion,
		StackName:               AgentDeploymentStackName,
		ParamLocation:           armParamLocation,
		ParamSignozAPIKey:       armParamSignozAPIKey,
		ParamSignozAPIUrl:       armParamSignozAPIUrl,
		ParamSignozIngestionURL: armParamSignozIngestionURL,
		ParamSignozIngestionKey: armParamSignozIngestionKey,
		ParamAccountID:          armParamAccountID,
		ParamAgentVersion:       armParamAgentVersion,
		ParamRgName:             armParamRgName,
		ParamContainerEnvName:   armParamContainerEnvName,
		ParamDeploymentEnv:      armParamDeploymentEnv,
		DefaultRgName:           armDefaultRgName,
		DefaultContainerEnvName: armDefaultContainerEnvName,
		DefaultDeploymentEnv:    armDefaultDeploymentEnv,
	}

	cliCommand, err := newAzureConnectionCLICommand(data)
	if err != nil {
		return nil, err
	}

	psCommand, err := newAzureConnectionPowerShellCommand(data)
	if err != nil {
		return nil, err
	}
	return &AzureConnectionArtifact{
		CLICommand:             cliCommand,
		CloudPowerShellCommand: psCommand,
	}, nil
}

func newAzureConnectionCLICommand(data azureTemplateData) (string, error) {
	var buf bytes.Buffer
	err := azureCLITemplate.Execute(&buf, data)
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}

func newAzureConnectionPowerShellCommand(data azureTemplateData) (string, error) {
	var buf bytes.Buffer
	err := azurePowerShellTemplate.Execute(&buf, data)
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}

func azureCLITemplateStr() string {
	return `az stack sub create \
  --name {{.StackName}} \
  --location {{.Location}} \
  --template-uri {{.TemplateURL}} \
  --parameters \
    {{.ParamLocation}}='{{.Location}}' \
    {{.ParamSignozAPIKey}}='{{.SignozAPIKey}}' \
    {{.ParamSignozAPIUrl}}='{{.SignozAPIUrl}}' \
    {{.ParamSignozIngestionURL}}='{{.SignozIngestionURL}}' \
    {{.ParamSignozIngestionKey}}='{{.SignozIngestionKey}}' \
    {{.ParamAccountID}}='{{.AccountID}}' \
    {{.ParamAgentVersion}}='{{.AgentVersion}}' \
  --action-on-unmanage deleteAll \
  --deny-settings-mode denyDelete`
}

func azurePowerShellTemplateStr() string {
	return "New-AzSubscriptionDeploymentStack `\n" +
		"  -Name \"{{.StackName}}\" `\n" +
		"  -Location \"{{.Location}}\" `\n" +
		"  -TemplateUri \"{{.TemplateURL}}\" `\n" +
		"  -TemplateParameterObject @{\n" +
		"    {{.ParamLocation}} = \"{{.Location}}\"\n" +
		"    {{.ParamSignozAPIKey}} = \"{{.SignozAPIKey}}\"\n" +
		"    {{.ParamSignozAPIUrl}} = \"{{.SignozAPIUrl}}\"\n" +
		"    {{.ParamSignozIngestionURL}} = \"{{.SignozIngestionURL}}\"\n" +
		"    {{.ParamSignozIngestionKey}} = \"{{.SignozIngestionKey}}\"\n" +
		"    {{.ParamAccountID}} = \"{{.AccountID}}\"\n" +
		"    {{.ParamAgentVersion}} = \"{{.AgentVersion}}\"\n" +
		"    {{.ParamRgName}} = \"{{.DefaultRgName}}\"\n" +
		"    {{.ParamContainerEnvName}} = \"{{.DefaultContainerEnvName}}\"\n" +
		"    {{.ParamDeploymentEnv}} = \"{{.DefaultDeploymentEnv}}\"\n" +
		"  } `\n" +
		"  -ActionOnUnmanage \"deleteAll\" `\n" +
		"  -DenySettingsMode \"denyDelete\""
}
