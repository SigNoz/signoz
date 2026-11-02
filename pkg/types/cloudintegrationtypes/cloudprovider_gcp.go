package cloudintegrationtypes

import (
	"bytes"
	"slices"
	"strings"
	"text/template"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	GCPConnectionMethodManual = GCPConnectionMethod{valuer.NewString("manual")}
	GCPConnectionMethodAgent  = GCPConnectionMethod{valuer.NewString("agent")}

	foundryScriptURL = "https://signoz.io/foundry.sh"

	gcpCLITemplate = template.Must(template.New("gcpCLI").Funcs(template.FuncMap{
		"shellQuote": func(value string) string {
			return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
		},
	}).Parse(gcpCLITemplateStr()))
)

type GCPConnectionMethod struct{ valuer.String }

func (GCPConnectionMethod) Enum() []any {
	return []any{GCPConnectionMethodManual, GCPConnectionMethodAgent}
}

type GCPAccountConfig struct {
	ConnectionMethod    GCPConnectionMethod `json:"connectionMethod" required:"true"`
	DeploymentProjectID string              `json:"deploymentProjectId" required:"true"`
	DeploymentRegion    string              `json:"deploymentRegion" required:"true"`
	// Agent accounts store exactly the deployment project; manual accounts may monitor multiple projects.
	ProjectIDs []string `json:"projectIds" required:"true" nullable:"false"`
}

type GCPPostableAccountConfig struct {
	ConnectionMethod    GCPConnectionMethod `json:"connectionMethod" required:"true"`
	DeploymentProjectID string              `json:"deploymentProjectId" required:"true"`
	DeploymentRegion    string              `json:"deploymentRegion" required:"true"`
	// Agent setup requires exactly DeploymentProjectID; manual setup may select multiple projects.
	ProjectIDs []string `json:"projectIds" required:"true" nullable:"false"`
}

// UpdatableGCPAccountConfig contains settings for manual integrations only.
type UpdatableGCPAccountConfig struct {
	DeploymentProjectID string   `json:"deploymentProjectId" required:"true"`
	DeploymentRegion    string   `json:"deploymentRegion" required:"true"`
	ProjectIDs          []string `json:"projectIds" required:"true" nullable:"false"`
}

type GCPConnectionArtifact struct {
	CLICommand string `json:"cliCommand" required:"true"`
}

type GCPIntegrationConfig struct {
	GCPAccountConfig
	TelemetryCollectionStrategy *GCPTelemetryCollectionStrategy `json:"telemetryCollectionStrategy" required:"true" nullable:"false"`
}

type GCPTelemetryCollectionStrategy struct {
	Metrics *GCPMetricsCollectionStrategy `json:"metrics" required:"true" nullable:"true"`
	Logs    *GCPLogsCollectionStrategy    `json:"logs" required:"true" nullable:"true"`
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

func (config *GCPAccountConfig) ErrIfInvalid() error {
	if config.ConnectionMethod.IsZero() {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "connectionMethod is required for GCP provider")
	}
	if config.ConnectionMethod != GCPConnectionMethodManual && config.ConnectionMethod != GCPConnectionMethodAgent {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "unsupported GCP connectionMethod: %q", config.ConnectionMethod.StringValue())
	}
	if err := validateGCPDeploymentProjectID(config.DeploymentProjectID); err != nil {
		return err
	}
	if err := validateGCPRegion(config.DeploymentRegion); err != nil {
		return err
	}
	if err := validateGCPProjectIDs(config.ProjectIDs); err != nil {
		return err
	}
	if config.ConnectionMethod == GCPConnectionMethodAgent && (len(config.ProjectIDs) != 1 || config.ProjectIDs[0] != config.DeploymentProjectID) {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds must contain only deploymentProjectId for GCP agent setup")
	}
	return nil
}

func NewGCPConnectionArtifact(integrationAccountID valuer.UUID, agentVersion string, creds *Credentials, cfg *GCPAccountConfig) (*GCPConnectionArtifact, error) {
	data := gcpTemplateData{
		FoundryScriptURL:     foundryScriptURL,
		ProjectID:            cfg.DeploymentProjectID,
		Region:               cfg.DeploymentRegion,
		IntegrationAccountID: integrationAccountID.StringValue(),
		AgentVersion:         agentVersion,
		Credentials:          creds,
	}

	var command bytes.Buffer
	if err := gcpCLITemplate.Execute(&command, data); err != nil {
		return nil, err
	}

	return &GCPConnectionArtifact{
		CLICommand: command.String(),
	}, nil
}

// NewGCPIntegrationConfig sorts and deduplicates the input slices in place and formats sink filters for joining with OR.
func NewGCPIntegrationConfig(config *GCPAccountConfig, metricNames, sinkFilters []string) *GCPIntegrationConfig {
	// Parentheses preserve each service filter's meaning when combined with OR.
	for i, filter := range sinkFilters {
		sinkFilters[i] = "(" + strings.TrimSpace(filter) + ")"
	}

	// Keep the generated config stable and avoid collecting shared metrics more than once.
	slices.Sort(metricNames)
	metricNames = slices.Compact(metricNames)
	slices.Sort(sinkFilters)
	sinkFilters = slices.Compact(sinkFilters)

	strategy := new(GCPTelemetryCollectionStrategy)
	if len(metricNames) > 0 {
		strategy.Metrics = &GCPMetricsCollectionStrategy{MetricNames: metricNames}
	}
	if len(sinkFilters) > 0 {
		strategy.Logs = &GCPLogsCollectionStrategy{SinkFilter: strings.Join(sinkFilters, " OR ")}
	}

	return &GCPIntegrationConfig{
		GCPAccountConfig:            *config,
		TelemetryCollectionStrategy: strategy,
	}
}

type gcpTemplateData struct {
	FoundryScriptURL     string
	ProjectID            string
	Region               string
	IntegrationAccountID string
	AgentVersion         string
	Credentials          *Credentials
}

func gcpCLITemplateStr() string {
	return `curl -fsSL {{.FoundryScriptURL | shellQuote}} | bash -s -- cloudintegration gcp terraform \
  --region {{.Region | shellQuote}} \
  --gcp-project {{.ProjectID | shellQuote}} \
  --integration-account-id {{.IntegrationAccountID | shellQuote}} \
  --signoz-api-url {{.Credentials.SigNozAPIURL | shellQuote}} \
  --signoz-api-key {{.Credentials.SigNozAPIKey | shellQuote}} \
  --ingestion-url {{.Credentials.IngestionURL | shellQuote}} \
  --ingestion-key {{.Credentials.IngestionKey | shellQuote}} \
  --agent-version {{.AgentVersion | shellQuote}}`
}

func validateGCPDeploymentProjectID(projectID string) error {
	if strings.TrimSpace(projectID) == "" {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "deploymentProjectId is required for GCP provider")
	}
	if projectID != strings.TrimSpace(projectID) {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "deploymentProjectId cannot contain leading or trailing whitespace")
	}
	return nil
}

func validateGCPProjectIDs(projectIDs []string) error {
	if len(projectIDs) == 0 {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds must contain at least one project ID for GCP provider")
	}

	for _, projectID := range projectIDs {
		if strings.TrimSpace(projectID) == "" {
			return errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds cannot contain an empty or whitespace-only project ID")
		}
		if projectID != strings.TrimSpace(projectID) {
			return errors.NewInvalidInputf(ErrCodeInvalidInput, "projectIds cannot contain leading or trailing whitespace")
		}
	}

	return nil
}
